-- OPCIONAL: ventas de ejemplo para probar las consultas por día y por mes
SET NAMES utf8mb4;
USE pizzeria;

INSERT INTO ventas (nombre_cliente, direccion, telefono, fecha_pedido, total) VALUES
('Mario Juárez',  '5 de mayo',   '477-787-23', '2026-11-09', 550.00),  -- lunes
('Juan Ramírez',  'Av. Reforma', '477-123-45', '2026-11-09', 280.00),  -- lunes
('Ana López',     'Calle Sol',   '477-555-01', '2026-11-10', 180.00),  -- martes
('Luis Pérez',    'Hidalgo 12',  '477-222-98', '2026-10-26', 310.00);  -- lunes de octubre

INSERT INTO detalle_venta (venta_id, tamano, ingredientes, num_pizzas, subtotal) VALUES
(1, 'Grande',  'Jamón, Piña',  3, 420.00),
(1, 'Grande',  'Jamón',        1, 130.00),
(2, 'Mediana', 'Jamón, Piña, Champiñones', 1, 110.00),
(2, 'Grande',  'Jamón',        1, 130.00),
(2, 'Chica',   'Sin ingredientes', 1, 40.00),
(3, 'Mediana', 'Jamón',        2, 180.00),
(4, 'Grande',  'Piña',         2, 260.00),
(4, 'Chica',   'Jamón',        1, 50.00);
