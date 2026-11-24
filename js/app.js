// Punto de entrada de Mi Uni.
import { iniciarShell } from './shell/shell.js';
import { cargarAjustes, perfilCtx } from './core/ajustes.js';
import { limpiarIncompletos, guardarRecurso, listarProyectos } from './core/proyectos.js';
import { diag } from './core/hooks.js';
import { revisarCierreAnterior } from './core/memoria.js';

revisarCierreAnterior(); // ADR-003: ¿se cerró la pestaña a mitad de un trabajo pesado?
cargarAjustes(); // en paralelo: las vistas que lo necesitan esperan a que termine
// Importaciones cortadas o trozos huérfanos de una pestaña cerrada a mitad (ADR-006).
limpiarIncompletos().then((r) => { if (r.proyectos || r.trozosHuerfanos) diag('proyectos:limpieza', r); }).catch(() => {});
iniciarShell({ version: 4, extras: { perfil: perfilCtx, proyectos: { listar: listarProyectos, guardar: guardarRecurso } } });
