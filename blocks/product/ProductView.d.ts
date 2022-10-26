export interface ProductViewAttribute {
  name: string;
  label: string;
  value: string;
  roles: string[];
}

export interface ProductViewImage {
  url: string;
  label: string;
}

export interface ProductView {
  addToCartAllowed: boolean;
  attributes: ProductViewAttribute[];
  description: string;
  images: ProductViewImage[];
  metaDescription: string;
  metaKeyword: string;
  metaTitle: string;
  name: string;
  shortDescription: string;
  sku: string;
}