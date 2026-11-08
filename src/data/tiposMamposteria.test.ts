import { describe, expect, it } from 'vitest';
import { capacidadMamposteriaReforzada, TIPOS_MAMPOSTERIA, tipoMamposteria } from './tiposMamposteria';

describe('D.2.1 — tipos de mampostería', () => {
  it('son siete, en el orden y con las secciones D.2.1.1 a D.2.1.7', () => {
    expect(TIPOS_MAMPOSTERIA).toHaveLength(7);
    expect(TIPOS_MAMPOSTERIA.map((t) => t.seccion)).toEqual(['D.2.1.1', 'D.2.1.2', 'D.2.1.3', 'D.2.1.4', 'D.2.1.5', 'D.2.1.6', 'D.2.1.7']);
    expect(TIPOS_MAMPOSTERIA.map((t) => t.capitulo)).toEqual(['D.6', 'D.7', 'D.8', 'D.9', 'D.10', 'D.11', 'D.12']);
  });

  it('asigna la capacidad de disipación de la norma', () => {
    expect(tipoMamposteria('cavidad-reforzada').capacidades).toEqual(['DES']);
    expect(tipoMamposteria('reforzada').capacidades).toEqual(['DES', 'DMO']);
    expect(tipoMamposteria('parcialmente-reforzada').capacidades).toEqual(['DMO']);
    expect(tipoMamposteria('no-reforzada').capacidades).toEqual(['DMI']);
    expect(tipoMamposteria('muros-confinados').capacidades).toEqual(['DMO']);
    expect(tipoMamposteria('reforzada-externamente').capacidades).toEqual(['DMI']);
  });

  it('los muros diafragma no se permiten en edificaciones nuevas y no tienen capacidad asignada', () => {
    const t = tipoMamposteria('muros-diafragma');
    expect(t.soloEdificacionesExistentes).toBe(true);
    expect(t.capacidades).toHaveLength(0);
    expect(TIPOS_MAMPOSTERIA.filter((x) => x.soloEdificacionesExistentes)).toHaveLength(1);
  });

  it('ids únicos', () => {
    expect(new Set(TIPOS_MAMPOSTERIA.map((t) => t.id)).size).toBe(7);
  });
});

describe('D.2.1.2 — capacidad de la mampostería reforzada', () => {
  it('DES con todas las celdas inyectadas o con los refuerzos mínimos de D.7.2.1.1', () => {
    expect(capacidadMamposteriaReforzada({ todasLasCeldasInyectadas: true, cumpleRefuerzoMinimoD7211: false })).toBe('DES');
    expect(capacidadMamposteriaReforzada({ todasLasCeldasInyectadas: false, cumpleRefuerzoMinimoD7211: true })).toBe('DES');
    expect(capacidadMamposteriaReforzada({ todasLasCeldasInyectadas: true, cumpleRefuerzoMinimoD7211: true })).toBe('DES');
  });

  it('DMO si solo se inyectan las celdas con refuerzo', () => {
    expect(capacidadMamposteriaReforzada({ todasLasCeldasInyectadas: false, cumpleRefuerzoMinimoD7211: false })).toBe('DMO');
  });

  it('tipoMamposteria lanza error con un id inválido', () => {
    // @ts-expect-error id inexistente
    expect(() => tipoMamposteria('otro')).toThrow();
  });
});
