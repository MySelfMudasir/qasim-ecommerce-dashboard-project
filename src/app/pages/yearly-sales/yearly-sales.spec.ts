import { ComponentFixture, TestBed } from '@angular/core/testing';

import { YearlySales } from './yearly-sales';

describe('YearlySales', () => {
  let component: YearlySales;
  let fixture: ComponentFixture<YearlySales>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [YearlySales]
    })
    .compileComponents();

    fixture = TestBed.createComponent(YearlySales);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
