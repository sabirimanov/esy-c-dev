import base from "./content.json"

export type Content = typeof base

export function useContent() {
  return base
}
