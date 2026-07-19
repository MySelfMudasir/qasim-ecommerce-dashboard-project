import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WeaklySales } from './weakly-sales';

describe('WeaklySales', () => {
  let component: WeaklySales;
  let fixture: ComponentFixture<WeaklySales>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WeaklySales]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WeaklySales);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
