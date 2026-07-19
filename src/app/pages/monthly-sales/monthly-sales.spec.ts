import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonthlySales } from './monthly-sales';

describe('MonthlySales', () => {
  let component: MonthlySales;
  let fixture: ComponentFixture<MonthlySales>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MonthlySales]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MonthlySales);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
