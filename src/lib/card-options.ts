// Which options a product card's size sheet shows, and the card button's label.
// Pure logic, no React.

type SheetOption = { title: string; values: string[] }

// An option with a single value (Size "OS", a lone colour) is nothing to pick:
// leave it out, as After Dark does (visibleToyOptions). The sheet's last option
// adds to the bag on tap, so a one-size item with colours becomes "tap a
// colour" instead of "pick a colour, then tap OS".
export function sheetOptions<O extends SheetOption>(options: readonly O[]): O[] {
  return options.filter(
    (o) => new Set(o.values.map((v) => v.trim()).filter(Boolean)).size >= 2,
  )
}

const titleIs = (o: SheetOption, ...names: string[]) =>
  names.includes(o.title.trim().toLowerCase())

/** The card button's label for the options the sheet will show. */
export function pickerLabel(
  options: readonly SheetOption[],
): "Select size" | "Select color" | "Select options" {
  if (options.some((o) => titleIs(o, "size"))) return "Select size"
  if (options.some((o) => titleIs(o, "color", "colour"))) return "Select color"
  return "Select options"
}
