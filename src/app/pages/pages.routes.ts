import { Routes } from '@angular/router';
import { Documentation } from './documentation/documentation';
import { Crud } from './crud/crud';
import { Empty } from './empty/empty';
import { Products } from './products/products';
import { Orders } from './orders/orders';
import { Categories } from './categories/categories';
import { Brands } from './brands/brands';
import { Users } from './users/users';
import { UserDetail } from './user-detail/user-detail';
import { MonthlySales } from './monthly-sales/monthly-sales';
import { DailySales } from './daily-sales/daily-sales';
import { YearlySales } from './yearly-sales/yearly-sales';
import { WeeklySales } from './weekly-sales/weekly-sales';

export default [
    { path: 'documentation', component: Documentation },
    { path: 'products', component: Products },
    { path: 'orders', component: Orders },
    { path: 'categories', component: Categories },
    { path: 'brands', component: Brands },
    { path: 'monthly-sales', component: MonthlySales },
    { path: 'weekly-sales', component: WeeklySales },
    { path: 'daily-sales', component: DailySales },
    { path: 'yearly-sales', component: YearlySales },
    { path: 'users', component: Users },
    { path: 'users/:id', component: UserDetail },
    { path: 'crud', component: Crud },
    { path: 'empty', component: Empty },
    { path: '**', redirectTo: '/notfound' }
] as Routes;
