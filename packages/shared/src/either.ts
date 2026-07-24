/**
 * Either — resultado tipado de sucesso/falha para fluxo de negócio (sem exceptions).
 * Convenção do spec: services retornam Either; exceptions ficam para erros de programação.
 */
export type Left<E> = { readonly ok: false; readonly error: E };
export type Right<T> = { readonly ok: true; readonly value: T };
export type Either<E, T> = Left<E> | Right<T>;

export const left = <E>(error: E): Left<E> => ({ ok: false, error });
export const right = <T>(value: T): Right<T> => ({ ok: true, value });

export const isLeft = <E, T>(e: Either<E, T>): e is Left<E> => !e.ok;
export const isRight = <E, T>(e: Either<E, T>): e is Right<T> => e.ok;

export function map<E, T, U>(
  e: Either<E, T>,
  fn: (value: T) => U
): Either<E, U> {
  return e.ok ? right(fn(e.value)) : e;
}

export function flatMap<E, T, U>(
  e: Either<E, T>,
  fn: (value: T) => Either<E, U>
): Either<E, U> {
  return e.ok ? fn(e.value) : e;
}

export function unwrapOr<E, T>(e: Either<E, T>, fallback: T): T {
  return e.ok ? e.value : fallback;
}
