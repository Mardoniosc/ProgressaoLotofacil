import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NumberGridComponent } from './number-grid.component';

describe('NumberGridComponent', () => {
  let fixture: ComponentFixture<NumberGridComponent>;
  let grid: NumberGridComponent;
  const el = () => fixture.nativeElement as HTMLElement;
  const ball = (n: number) => el().querySelector<HTMLButtonElement>(`[data-number="${n}"]`)!;

  beforeEach(async () => {
    fixture = TestBed.createComponent(NumberGridComponent);
    grid = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('renderiza os 25 números de 01 a 25', () => {
    const balls = el().querySelectorAll('.ball');
    expect(balls.length).toBe(25);
    expect(balls[0].textContent?.trim()).toBe('01');
    expect(balls[24].textContent?.trim()).toBe('25');
  });

  it('seleciona ao clicar (ordenado)', async () => {
    ball(7).click();
    ball(3).click();
    await fixture.whenStable();
    expect(grid.selected()).toEqual([3, 7]);
    expect(ball(3).classList).toContain('selected');
    expect(ball(3).getAttribute('aria-pressed')).toBe('true');
  });

  it('remove ao clicar novamente', async () => {
    ball(5).click();
    ball(5).click();
    await fixture.whenStable();
    expect(grid.selected()).toEqual([]);
    expect(ball(5).classList).not.toContain('selected');
  });

  it('limita a 15 números e desabilita os demais', async () => {
    for (let n = 1; n <= 16; n++) grid.toggle(n);
    await fixture.whenStable();
    expect(grid.selected().length).toBe(15);
    expect(grid.selected()).not.toContain(16);
    expect(grid.complete()).toBe(true);
    expect(ball(16).disabled).toBe(true);
    expect(ball(1).disabled).toBe(false);
    expect(el().textContent).toContain('Completo');
    expect(el().textContent).toContain('15 / 15');
  });

  it('permite remover um número mesmo com o jogo completo', async () => {
    for (let n = 1; n <= 15; n++) grid.toggle(n);
    grid.toggle(10);
    expect(grid.selected().length).toBe(14);
    grid.toggle(20);
    expect(grid.selected()).toContain(20);
  });

  it('respeita limite configurável (ex.: 17 números)', async () => {
    fixture.componentRef.setInput('max', 17);
    for (let n = 1; n <= 20; n++) grid.toggle(n);
    expect(grid.selected().length).toBe(17);
  });

  it('limpa a seleção', async () => {
    grid.toggle(1);
    grid.toggle(2);
    grid.clear();
    await fixture.whenStable();
    expect(grid.selected()).toEqual([]);
    expect(el().textContent).toContain('0 / 15');
  });

  it('ignora números fora de 1–25', () => {
    grid.toggle(0);
    grid.toggle(26);
    expect(grid.selected()).toEqual([]);
  });
});
