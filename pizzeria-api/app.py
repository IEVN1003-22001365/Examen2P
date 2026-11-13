import unicodedata
from datetime import date, datetime
from decimal import Decimal

import mysql.connector
from flask import Flask, flash, get_flashed_messages, jsonify, request
from flask_cors import CORS

from config import DB_CONFIG, FRONTEND_ORIGIN

app = Flask(__name__)
app.secret_key = "pizzeria-segundo-parcial"
CORS(app, resources={r"/api/*": {"origins": FRONTEND_ORIGIN}})

TAMANOS = {"Chica": 40, "Mediana": 80, "Grande": 120}
INGREDIENTES = {"Jamón": 10, "Piña": 10, "Champiñones": 10}

DIAS = {"domingo": 1, "lunes": 2, "martes": 3, "miercoles": 4, "jueves": 5, "viernes": 6, "sabado": 7}
MESES = {
    "enero": 1, "febrero": 2, "marzo": 3, "abril": 4, "mayo": 5, "junio": 6,
    "julio": 7, "agosto": 8, "septiembre": 9, "octubre": 10, "noviembre": 11, "diciembre": 12,
}


def get_conn():
    return mysql.connector.connect(**DB_CONFIG)


def normaliza(texto: str) -> str:
    texto = unicodedata.normalize("NFD", (texto or "").strip().lower())
    return "".join(c for c in texto if unicodedata.category(c) != "Mn")


def limpia(fila: dict) -> dict:
    salida = {}
    for k, v in fila.items():
        if isinstance(v, Decimal):
            v = float(v)
        elif isinstance(v, (date, datetime)):
            v = v.isoformat()[:10]
        salida[k] = v
    return salida


def consultar(sql: str, params: tuple = ()) -> list[dict]:
    conn = get_conn()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(sql, params)
        return [limpia(f) for f in cur.fetchall()]
    finally:
        conn.close()


def error(mensaje: str, codigo: int = 400):
    return jsonify(error=mensaje), codigo


@app.errorhandler(mysql.connector.Error)
def error_bd(e):
    return error(f"Error de base de datos: {e}", 500)


@app.get("/api/catalogo")
def catalogo():
    return jsonify(
        tamanos=[{"nombre": n, "precio": p} for n, p in TAMANOS.items()],
        ingredientes=[{"nombre": n, "precio": p} for n, p in INGREDIENTES.items()],
    )


@app.get("/api/detalle-temp")
def listar_detalle():
    return jsonify(consultar("SELECT id, tamano, ingredientes, num_pizzas, subtotal FROM detalle_temp ORDER BY id"))


@app.post("/api/detalle-temp")
def agregar_pizza():
    datos = request.get_json(silent=True) or {}
    tamano = datos.get("tamano")
    ingredientes = datos.get("ingredientes") or []
    try:
        num = int(datos.get("num_pizzas"))
    except (TypeError, ValueError):
        return error("El número de pizzas debe ser un entero.")

    if tamano not in TAMANOS:
        return error("Elige un tamaño válido.")
    if any(i not in INGREDIENTES for i in ingredientes):
        return error("Hay ingredientes que no existen.")
    if not 1 <= num <= 50:
        return error("El número de pizzas debe estar entre 1 y 50.")

    precio_unitario = TAMANOS[tamano] + sum(INGREDIENTES[i] for i in ingredientes)
    subtotal = precio_unitario * num
    texto_ingredientes = ", ".join(ingredientes) if ingredientes else "Sin ingredientes"

    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO detalle_temp (tamano, ingredientes, num_pizzas, subtotal) VALUES (%s, %s, %s, %s)",
            (tamano, texto_ingredientes, num, subtotal),
        )
        conn.commit()
        nuevo_id = cur.lastrowid
    finally:
        conn.close()

    return jsonify(id=nuevo_id, tamano=tamano, ingredientes=texto_ingredientes,
                   num_pizzas=num, subtotal=subtotal), 201


@app.delete("/api/detalle-temp/<int:item_id>")
def quitar_pizza(item_id: int):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM detalle_temp WHERE id = %s", (item_id,))
        conn.commit()
        if cur.rowcount == 0:
            return error("Esa pizza ya no está en el pedido.", 404)
    finally:
        conn.close()
    return jsonify(ok=True)


@app.post("/api/pedido/terminar")
def terminar_pedido():
    datos = request.get_json(silent=True) or {}
    nombre = (datos.get("nombre") or "").strip()
    direccion = (datos.get("direccion") or "").strip()
    telefono = (datos.get("telefono") or "").strip()
    try:
        fecha = datetime.strptime(datos.get("fecha") or "", "%Y-%m-%d").date()
    except ValueError:
        return error("La fecha no es válida.")

    if not (nombre and direccion and telefono):
        return error("Nombre, dirección y teléfono son obligatorios.")

    conn = get_conn()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT tamano, ingredientes, num_pizzas, subtotal FROM detalle_temp ORDER BY id")
        items = cur.fetchall()
        if not items:
            return error("Agrega al menos una pizza al pedido.")

        total = sum(i["subtotal"] for i in items)

        cur.execute(
            "INSERT INTO ventas (nombre_cliente, direccion, telefono, fecha_pedido, total) "
            "VALUES (%s, %s, %s, %s, %s)",
            (nombre, direccion, telefono, fecha, total),
        )
        venta_id = cur.lastrowid
        cur.executemany(
            "INSERT INTO detalle_venta (venta_id, tamano, ingredientes, num_pizzas, subtotal) "
            "VALUES (%s, %s, %s, %s, %s)",
            [(venta_id, i["tamano"], i["ingredientes"], i["num_pizzas"], i["subtotal"]) for i in items],
        )
        cur.execute("DELETE FROM detalle_temp")
        conn.commit()
    except mysql.connector.Error:
        conn.rollback()
        raise
    finally:
        conn.close()

    flash(f"Pedido registrado. Total a pagar: ${float(total):,.2f}")
    return jsonify(ok=True, venta_id=venta_id, total=float(total), mensajes=get_flashed_messages()), 201


def resumen(ventas: list[dict]):
    total = sum(v["total"] for v in ventas)
    return jsonify(ventas=ventas, total=total)


@app.get("/api/ventas/dia")
def ventas_por_dia():
    dia = normaliza(request.args.get("dia", ""))
    if dia not in DIAS:
        return error("Escribe un día de la semana válido (lunes, martes, miércoles...).")
    ventas = consultar(
        "SELECT id, nombre_cliente, direccion, telefono, fecha_pedido, total "
        "FROM ventas WHERE DAYOFWEEK(fecha_pedido) = %s ORDER BY fecha_pedido, id",
        (DIAS[dia],),
    )
    return resumen(ventas)


@app.get("/api/ventas/mes")
def ventas_por_mes():
    mes = normaliza(request.args.get("mes", ""))
    if mes not in MESES:
        return error("Escribe un mes válido (enero, febrero...).")
    ventas = consultar(
        "SELECT id, nombre_cliente, direccion, telefono, fecha_pedido, total "
        "FROM ventas WHERE MONTH(fecha_pedido) = %s ORDER BY fecha_pedido, id",
        (MESES[mes],),
    )
    return resumen(ventas)


@app.get("/api/ventas/<int:venta_id>/detalle")
def detalle_venta(venta_id: int):
    venta = consultar(
        "SELECT id, nombre_cliente, direccion, telefono, fecha_pedido, total FROM ventas WHERE id = %s",
        (venta_id,),
    )
    if not venta:
        return error("La venta no existe.", 404)
    items = consultar(
        "SELECT id, tamano, ingredientes, num_pizzas, subtotal FROM detalle_venta WHERE venta_id = %s ORDER BY id",
        (venta_id,),
    )
    return jsonify(venta=venta[0], items=items)


if __name__ == "__main__":
    app.run(debug=True, port=5000)
