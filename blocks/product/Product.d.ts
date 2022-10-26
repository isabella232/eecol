export interface ProductPage {
  data: ProductData[];
  totalCount: number;
  facets: ProductFacet[];
  pageInfo: PageInfo;
}

export interface PageInfo {
  currentPage: number;
  pageSize: number;
  totalPages: number;
}

export interface ProductData {
  sku: string;
  name: string;
  manufacturer: string;
  description: string;
  image: string;
  categories: string[];
  manufacturer_code: string;
  manufacturer_part_number_brand: string;
  manufacturer_part_number: string;
  path: string;
}

export interface ProductFacetOption {
  label: string;
  count: number;
  value: string;
}

export interface ProductFacet {
  attribute_code: string;
  label: string;
  options: ProductFacetOption[];
}