import { CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DetalleItem } from '../../models/pizzeria.models';
import { PedidoService } from '../../services/pedido.service';

@Component({
  selector: 'app-detalle-pedido',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './detalle-pedido.component.html',
})
export class DetallePedidoComponent {
  private srv = inject(PedidoService);

  items: DetalleItem[] = [];
  seleccionado: number | null = null;
  enviando = false;

  constructor() {
    this.srv.detalle$.pipe(takeUntilDestroyed()).subscribe((items) => {
      this.items = items;
      if (!items.some((i) => i.id === this.seleccionado)) this.seleccionado = null;
    });
    this.srv.cargarDetalle();
  }

  get total(): number {
    return this.items.reduce((suma, i) => suma + Number(i.subtotal), 0);
  }

  seleccionar(id: number): void {
    this.seleccionado = this.seleccionado === id ? null : id;
  }

  quitar(): void {
    if (this.seleccionado === null) {
      this.srv.mensaje$.next({ tipo: 'info', texto: 'Selecciona una pizza de la tabla para quitarla.' });
      return;
    }
    this.srv.quitar(this.seleccionado).subscribe({ error: (e) => this.srv.error(e) });
  }

  terminar(): void {
    const cliente = this.srv.cliente$.value;
    if (!cliente.valido || !cliente.valor) {
      this.srv.mensaje$.next({ tipo: 'error', texto: 'Completa correctamente los datos del cliente antes de terminar.' });
      return;
    }
    if (this.items.length === 0) {
      this.srv.mensaje$.next({ tipo: 'error', texto: 'Agrega al menos una pizza al pedido.' });
      return;
    }
    this.enviando = true;
    this.srv.terminar(cliente.valor).subscribe({
      next: (r) => {
        this.enviando = false;
        // Mensaje "flash" enviado por Flask con el importe total
        this.srv.mensaje$.next({ tipo: 'exito', texto: r.mensajes[0] ?? `Total a pagar: $${r.total}` });
      },
      error: (e) => {
        this.enviando = false;
        this.srv.error(e);
      },
    });
  }
}
