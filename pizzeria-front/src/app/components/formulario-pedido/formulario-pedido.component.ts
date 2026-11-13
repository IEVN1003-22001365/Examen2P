import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Catalogo, Cliente } from '../../models/pizzeria.models';
import { PedidoService } from '../../services/pedido.service';

function hoy(): string {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

@Component({
  selector: 'app-formulario-pedido',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './formulario-pedido.component.html',
})
export class FormularioPedidoComponent {
  private fb = inject(FormBuilder);
  private srv = inject(PedidoService);

  catalogo?: Catalogo;

  // Un control booleano por cada ingrediente (se crean al recibir el catálogo)
  ingredientes = new FormGroup<Record<string, FormControl<boolean | null>>>({});

  form = this.fb.group({
    cliente: this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      direccion: ['', Validators.required],
      telefono: ['', [Validators.required, Validators.pattern(/^[0-9\- ]{7,15}$/)]],
      fecha: [hoy(), Validators.required],
    }),
    pizza: this.fb.group({
      tamano: ['', Validators.required],
      ingredientes: this.ingredientes,
      numPizzas: this.fb.control<number | null>(null, [
        Validators.required,
        Validators.min(1),
        Validators.max(50),
      ]),
    }),
  });

  constructor() {
    this.srv.getCatalogo().subscribe({
      next: (c) => {
        this.catalogo = c;
        c.ingredientes.forEach((i) => this.ingredientes.addControl(i.nombre, new FormControl(false)));
      },
      error: (e) => this.srv.error(e),
    });

    // Cada cambio en los datos del cliente se comparte con el componente de detalle
    this.form.controls.cliente.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.publicarCliente());
    this.publicarCliente();

    // Cuando el pedido se guarda, se limpia todo
    this.srv.reiniciar$.pipe(takeUntilDestroyed()).subscribe(() => {
      this.form.reset({
        cliente: { nombre: '', direccion: '', telefono: '', fecha: hoy() },
        pizza: { tamano: '', numPizzas: null },
      });
    });
  }

  private publicarCliente(): void {
    const g = this.form.controls.cliente;
    this.srv.cliente$.next({ valor: g.getRawValue() as Cliente, valido: g.valid });
  }

  campoInvalido(grupo: 'cliente' | 'pizza', campo: string): boolean {
    const c = this.form.get([grupo, campo]);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  agregar(): void {
    const pizza = this.form.controls.pizza;
    if (pizza.invalid) {
      pizza.markAllAsTouched();
      return;
    }
    const v = pizza.getRawValue();
    const ingredientes = Object.entries(v.ingredientes)
      .filter(([, marcado]) => !!marcado)
      .map(([nombre]) => nombre);

    this.srv.agregar({ tamano: v.tamano!, ingredientes, num_pizzas: v.numPizzas! }).subscribe({
      next: () => pizza.reset({ tamano: '', numPizzas: null }),
      error: (e) => this.srv.error(e),
    });
  }
}
