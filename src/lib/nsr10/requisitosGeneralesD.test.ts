import { describe, expect, it } from 'vitest';
import {
  AREA_SUPERVISION_OBLIGATORIA_M2,
  CONTENIDO_PLANOS_D,
  limiteRigidezOrtogonal,
  supervisionTecnica,
  verificarRigidezOrtogonal,
} from './requisitosGeneralesD';

describe('D.1.4.1.1 — rigidez entre direcciones ortogonales', () => {
  it('límite 20 % para tres niveles o más y 10 % para uno o dos', () => {
    expect(limiteRigidezOrtogonal(1)).toBe(0.1);
    expect(limiteRigidezOrtogonal(2)).toBe(0.1);
    expect(limiteRigidezOrtogonal(3)).toBe(0.2);
    expect(limiteRigidezOrtogonal(5)).toBe(0.2);
  });

  it('cumple exactamente en el límite y falla por debajo', () => {
    expect(verificarRigidezOrtogonal(20, 100, 4).cumple).toBe(true);
    expect(verificarRigidezOrtogonal(19.9, 100, 4).cumple).toBe(false);
    expect(verificarRigidezOrtogonal(10, 100, 2).cumple).toBe(true);
    expect(verificarRigidezOrtogonal(15, 100, 3).cumple).toBe(false);
    expect(verificarRigidezOrtogonal(15, 100, 2).cumple).toBe(true);
  });

  it('identifica la dirección débil sin importar el orden', () => {
    expect(verificarRigidezOrtogonal(30, 120, 3).direccionDebil).toBe('x');
    expect(verificarRigidezOrtogonal(120, 30, 3).direccionDebil).toBe('y');
    expect(verificarRigidezOrtogonal(50, 50, 3).direccionDebil).toBe('igual');
    expect(verificarRigidezOrtogonal(120, 30, 3).relacion).toBeCloseTo(0.25, 12);
  });

  it('rechaza entradas inválidas', () => {
    expect(() => verificarRigidezOrtogonal(0, 10, 3)).toThrow();
    expect(() => limiteRigidezOrtogonal(0)).toThrow();
  });
});

describe('D.1.3.1 — supervisión técnica', () => {
  it('es obligatoria solo por encima de 3000 m²', () => {
    expect(AREA_SUPERVISION_OBLIGATORIA_M2).toBe(3000);
    expect(supervisionTecnica(3000.5)).toBe('obligatoria');
    expect(supervisionTecnica(3000)).toBe('recomendada');
    expect(supervisionTecnica(850)).toBe('recomendada');
  });
});

describe('D.1.2.1 — contenido de los planos', () => {
  it('tiene los nueve literales (a)–(i) en orden', () => {
    expect(CONTENIDO_PLANOS_D.map((x) => x.literal).join('')).toBe('abcdefghi');
  });
});
