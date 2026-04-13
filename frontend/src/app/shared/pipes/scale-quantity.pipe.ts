import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'scaleQuantity', standalone: true })
export class ScaleQuantityPipe implements PipeTransform {
  transform(quantity: number | null, factor: number): string {
    if (quantity === null) return '';
    const scaled = quantity * factor;
    // Format: remove trailing zeros, max 2 decimals
    return Number(scaled.toFixed(2)).toString();
  }
}
