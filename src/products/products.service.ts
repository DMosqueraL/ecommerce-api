import { Injectable, NotFoundException } from '@nestjs/common';
import type { Product } from './product.interface';

@Injectable()
export class ProductsService {
  private products: Product[] = [
    { id: 1, name: 'Laptop', description: 'Laptop gamer 16GB RAM', price: 1200, stock: 10 },
    { id: 2, name: 'Mouse', description: 'Mouse inalámbrico ergonómico', price: 35, stock: 50 },
    { id: 3, name: 'Teclado', description: 'Teclado mecánico RGB', price: 80, stock: 30 },
  ];

  private nextId = 4;

  findAll(): Product[] {
    return this.products;
  }

  findOne(id: number): Product {
    const product = this.products.find((p) => p.id === id);
    if (!product) throw new NotFoundException(`Producto con id ${id} no encontrado`);
    return product;
  }

  create(data: Omit<Product, 'id'>): Product {
    const product: Product = { id: this.nextId++, ...data };
    this.products.push(product);
    return product;
  }

  replace(id: number, data: Omit<Product, 'id'>): Product {
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) throw new NotFoundException(`Producto con id ${id} no encontrado`);
    this.products[index] = { id, ...data };
    return this.products[index];
  }

  patch(id: number, data: Partial<Omit<Product, 'id'>>): Product {
    const product = this.findOne(id);
    Object.assign(product, data);
    return product;
  }

  remove(id: number): void {
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) throw new NotFoundException(`Producto con id ${id} no encontrado`);
    this.products.splice(index, 1);
  }
}
