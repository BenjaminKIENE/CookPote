import { Component, Output, EventEmitter, OnInit, OnDestroy, ElementRef, Input } from '@angular/core';

@Component({
  selector: 'app-infinite-scroll',
  standalone: true,
  template: `<div class="scroll-sentinel"></div>`,
  styles: [`.scroll-sentinel { height: 1px; }`],
})
export class InfiniteScrollComponent implements OnInit, OnDestroy {
  @Input() disabled = false;
  @Output() scrolled = new EventEmitter<void>();

  private observer: IntersectionObserver | null = null;

  constructor(private readonly el: ElementRef) {}

  ngOnInit(): void {
    this.observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting && !this.disabled) {
          this.scrolled.emit();
        }
      },
      { threshold: 0.1 },
    );
    this.observer.observe(this.el.nativeElement.querySelector('.scroll-sentinel'));
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
