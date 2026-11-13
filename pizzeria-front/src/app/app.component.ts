import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DetallePedidoComponent } from './components/detalle-pedido/detalle-pedido.component';
import { FormularioPedidoComponent } from './components/formulario-pedido/formulario-pedido.component';
import { VentasComponent } from './components/ventas/ventas.component';
import { Mensaje } from './models/pizzeria.models';
import { PedidoService } from './services/pedido.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormularioPedidoComponent, DetallePedidoComponent, VentasComponent],
  templateUrl: './app.component.html',
})
export class AppComponent {
  private srv = inject(PedidoService);
  mensaje?: Mensaje;
  private temporizador?: ReturnType<typeof setTimeout>;

  constructor() {
    this.srv.mensaje$.pipe(takeUntilDestroyed()).subscribe((m) => {
      this.mensaje = m;
      clearTimeout(this.temporizador);
      this.temporizador = setTimeout(() => (this.mensaje = undefined), 7000);
    });
  }

  cerrarMensaje(): void {
    this.mensaje = undefined;
  }
}
