import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WeeklySales } from './weekly-sales';

describe('WeeklySales', () => {
  let component: WeeklySales;
  let fixture: ComponentFixture<WeeklySales>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WeeklySales]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WeeklySales);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
