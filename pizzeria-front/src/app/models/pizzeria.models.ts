export interface Opcion {
  nombre: string;
  precio: number;
}

export interface Catalogo {
  tamanos: Opcion[];
  ingredientes: Opcion[];
}

export interface Cliente {
  nombre: string;
  direccion: string;
  telefono: string;
  fecha: string; // yyyy-mm-dd
}

export interface PizzaNueva {
  tamano: string;
  ingredientes: string[];
  num_pizzas: number;
}

export interface DetalleItem {
  id: number;
  tamano: string;
  ingredientes: string;
  num_pizzas: number;
  subtotal: number;
}

export interface Venta {
  id: number;
  nombre_cliente: string;
  direccion: string;
  telefono: string;
  fecha_pedido: string;
  total: number;
}

export interface ResumenVentas {
  ventas: Venta[];
  total: number;
}

export interface DetalleVenta {
  venta: Venta;
  items: DetalleItem[];
}

export interface RespuestaTerminar {
  ok: boolean;
  venta_id: number;
  total: number;
  mensajes: string[];
}

export interface Mensaje {
  tipo: 'exito' | 'error' | 'info';
  texto: string;
}
