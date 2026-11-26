/** Só deixa passar http(s), mailto, âncoras e caminhos do próprio site; qualquer outra coisa (ex.: `javascript:`) vira "". */
export const safeHref = (href: string | undefined | null): string => {
  const h = (href ?? "").trim()
  return /^(https?:\/\/|mailto:|#|\/(?!\/))/i.test(h) ? h : ""
}
