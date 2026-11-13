import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, Subject, tap } from 'rxjs';
import {
  Catalogo,
  Cliente,
  DetalleItem,
  DetalleVenta,
  Mensaje,
  PizzaNueva,
  RespuestaTerminar,
  ResumenVentas,
} from '../models/pizzeria.models';

@Injectable({ providedIn: 'root' })
export class PedidoService {
  private http = inject(HttpClient);
  private api = 'http://localhost:5000/api';

  /** Pizzas agregadas al pedido en curso (tabla de detalle). */
  detalle$ = new BehaviorSubject<DetalleItem[]>([]);

  /** Datos del cliente que se están capturando y si el formulario es válido. */
  cliente$ = new BehaviorSubject<{ valor: Cliente | null; valido: boolean }>({
    valor: null,
    valido: false,
  });

  /** Mensajes tipo "flash" para mostrar arriba de la pantalla. */
  mensaje$ = new Subject<Mensaje>();

  /** Se emite cuando el pedido se guardó para limpiar el formulario. */
  reiniciar$ = new Subject<void>();

  getCatalogo(): Observable<Catalogo> {
    return this.http.get<Catalogo>(`${this.api}/catalogo`);
  }

  cargarDetalle(): void {
    this.http.get<DetalleItem[]>(`${this.api}/detalle-temp`).subscribe({
      next: (items) => this.detalle$.next(items),
      error: (e) => this.error(e),
    });
  }

  agregar(pizza: PizzaNueva): Observable<DetalleItem> {
    return this.http
      .post<DetalleItem>(`${this.api}/detalle-temp`, pizza)
      .pipe(tap(() => this.cargarDetalle()));
  }

  quitar(id: number): Observable<unknown> {
    return this.http.delete(`${this.api}/detalle-temp/${id}`).pipe(tap(() => this.cargarDetalle()));
  }

  terminar(cliente: Cliente): Observable<RespuestaTerminar> {
    return this.http.post<RespuestaTerminar>(`${this.api}/pedido/terminar`, cliente).pipe(
      tap(() => {
        this.detalle$.next([]);
        this.reiniciar$.next();
      }),
    );
  }

  ventasPorDia(dia: string): Observable<ResumenVentas> {
    return this.http.get<ResumenVentas>(`${this.api}/ventas/dia`, { params: { dia } });
  }

  ventasPorMes(mes: string): Observable<ResumenVentas> {
    return this.http.get<ResumenVentas>(`${this.api}/ventas/mes`, { params: { mes } });
  }

  detalleVenta(id: number): Observable<DetalleVenta> {
    return this.http.get<DetalleVenta>(`${this.api}/ventas/${id}/detalle`);
  }

  /** Muestra un error del servidor (o de conexión) como mensaje flash. */
  error(e: any): void {
    const texto = e?.error?.error ?? 'No se pudo conectar con el servidor. ¿Está corriendo Flask?';
    this.mensaje$.next({ tipo: 'error', texto });
  }
}
