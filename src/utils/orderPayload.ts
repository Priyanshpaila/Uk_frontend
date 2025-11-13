// src/utils/orderPayload.ts

type CartOption = { label?: string; value?: string };

type CartItem = {
  sku?: string;
  name?: string;
  qty?: number;
  price?: number; // major units
  priceMinor?: number;
  unitMinor?: number;
  totalMinor?: number;
  variations?: string;
  variation?: string;
  optionLabel?: string;
  option_label?: string;
  optionText?: string;
  option_text?: string;
  selectedLabel?: string;
  selected?: { label?: string; value?: string } | null;
  selectedOption?: { label?: string; value?: string } | null;
  options?: CartOption[];
  attributes?: CartOption[];
};

function getMinor(v?: number | null) {
  if (typeof v === "number") return Math.round(v * 100);
  return 0;
}

export function getVariation(it: CartItem): string | null {
  return (
    it.variations ??
    it.variation ??
    it.optionLabel ??
    it.option_label ??
    it.optionText ??
    it.option_text ??
    it.selectedLabel ??
    it.selected?.label ??
    it.selectedOption?.label ??
    it.attributes?.[0]?.label ??
    it.options?.[0]?.label ??
    null
  );
}

export function mapCartToItems(cartItems: CartItem[]) {
  return cartItems.map((it) => {
    const qty = Math.max(1, it.qty ?? 1);
    const unitMinor =
      it.unitMinor ??
      it.priceMinor ??
      getMinor(it.price ?? null);

    const totalMinor =
      it.totalMinor ??
      (unitMinor ? unitMinor * qty : 0);

    return {
      sku: it.sku ?? "item",
      name: it.name ?? "Item",
      qty,
      variations: getVariation(it),
      unitMinor,
      totalMinor,
    };
  });
}