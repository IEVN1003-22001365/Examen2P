import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DetalleVenta, ResumenVentas } from '../../models/pizzeria.models';
import { PedidoService } from '../../services/pedido.service';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, FormsModule],
  templateUrl: './ventas.component.html',
})
export class VentasComponent {
  private srv = inject(PedidoService);

  dias = [...DIAS.slice(1), DIAS[0]]; // lunes ... domingo
  meses = MESES;

  modo: 'dia' | 'mes' = 'dia';
  dia = DIAS[new Date().getDay()];
  mes = MESES[new Date().getMonth()];

  resultado?: ResumenVentas;
  etiqueta = '';
  detalle?: DetalleVenta;

  cambiarModo(modo: 'dia' | 'mes'): void {
    this.modo = modo;
    this.resultado = undefined;
  }

  consultar(): void {
    const peticion = this.modo === 'dia' ? this.srv.ventasPorDia(this.dia) : this.srv.ventasPorMes(this.mes);
    peticion.subscribe({
      next: (r) => {
        this.resultado = r;
        this.etiqueta = this.modo === 'dia' ? this.dia : this.mes;
      },
      error: (e) => this.srv.error(e),
    });
  }

  verDetalle(id: number): void {
    this.srv.detalleVenta(id).subscribe({
      next: (d) => (this.detalle = d),
      error: (e) => this.srv.error(e),
    });
  }

  cerrarDetalle(): void {
    this.detalle = undefined;
  }
}
