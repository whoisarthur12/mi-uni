// Punto de entrada de Mi Uni.
import { iniciarShell } from './shell/shell.js';
import { cargarAjustes, perfilCtx } from './core/ajustes.js';

cargarAjustes(); // en paralelo: las vistas que lo necesitan esperan a que termine
iniciarShell({ version: 2, extras: { perfil: perfilCtx } });
