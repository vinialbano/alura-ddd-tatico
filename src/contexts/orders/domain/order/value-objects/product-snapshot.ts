export interface ProductSnapshotProps {
  name: string;
  description: string;
  sku: string;
}

export class ProductSnapshot {
  public readonly name: string;
  public readonly description: string;
  public readonly sku: string;

  constructor(props: ProductSnapshotProps) {
    this.validateName(props.name);
    this.validateDescription(props.description);
    this.validateSku(props.sku);

    this.name = props.name.trim();
    this.description = props.description.trim();
    this.sku = props.sku.trim();
  }

  private validateName(name: string): void {
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      throw new Error('Product name cannot be empty');
    }
    if (trimmedName.length > 200) {
      throw new Error('Product name cannot exceed 200 characters');
    }
  }

  private validateDescription(description: string): void {
    const trimmedDescription = description.trim();
    if (trimmedDescription.length === 0) {
      throw new Error('Product description cannot be empty');
    }
    if (trimmedDescription.length > 1000) {
      throw new Error('Product description cannot exceed 1000 characters');
    }
  }

  private validateSku(sku: string): void {
    const trimmedSku = sku.trim();
    if (trimmedSku.length === 0) {
      throw new Error('Product SKU cannot be empty');
    }
    if (trimmedSku.length > 50) {
      throw new Error('Product SKU cannot exceed 50 characters');
    }
  }

  equals(other: ProductSnapshot): boolean {
    return (
      this.name === other.name &&
      this.description === other.description &&
      this.sku === other.sku
    );
  }

  toString(): string {
    return `${this.name} (SKU: ${this.sku})`;
  }
}
