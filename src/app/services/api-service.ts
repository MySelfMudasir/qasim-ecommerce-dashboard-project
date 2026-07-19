import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ApiService {
    // private baseUrl = `https://qasim-ecommerce-backend-project.onrender.com/api`;
    private baseUrl = `http://localhost:3000/api`;

    constructor(private http: HttpClient) {}

    login(data: any): Observable<any> {
        return this.http.post(`${this.baseUrl}/admin/auth/login`, data);
    }

    register(payload: any): Observable<any> {
        return this.http.post(`${this.baseUrl}/admin/auth/register`, payload);
    }

    loadProducts(search?: string, categoryId?: string, brandId?: string, storageType?: string, size?: string, minPrice?: number, maxPrice?: number, inStock?: boolean, limit?: number, page?: number): Observable<any> {
        let params = new HttpParams();

        if (search) params = params.set('search', search);
        // if (category && category !== 'all') params = params.set('category', category);
        if (categoryId) params = params.set('categoryId', categoryId);
        // if (brand) params = params.set('brand', brand);
        if (brandId) params = params.set('brandId', brandId);
        if (storageType) params = params.set('storageType', storageType);
        if (size) params = params.set('size', size);
        if (minPrice != null) params = params.set('minPrice', minPrice.toString());
        if (maxPrice != null) params = params.set('maxPrice', maxPrice.toString());
        if (inStock != null) params = params.set('inStock', inStock.toString());
        if (limit != null) params = params.set('limit', limit.toString());
        if (page != null) params = params.set('page', page.toString());

        return this.http.get<any>(`${this.baseUrl}/products`, { params });
    }

    getCategories(): Observable<any> {
        return this.http.get<any>(`${this.baseUrl}/categories`);
    }

    getBrands(): Observable<any> {
        return this.http.get<any>(`${this.baseUrl}/brands`);
    }

    createProduct(formData: FormData): Observable<any> {
        return this.http.post<any>(`${this.baseUrl}/products`, formData);
    }

    updateProduct(id: number, formData: FormData): Observable<any> {
        // Your Postman collection shows PUT {{baseUrl}}/api/product/{{id}} (singular).
        // CONFIRM this against your actual backend - update the URL below if wrong.
        return this.http.put<any>(`${this.baseUrl}/products/${id}`, formData);
    }

    deleteProduct(id: number): Observable<any> {
        // Same note as above - collection shows singular "product" for delete.
        return this.http.delete<any>(`${this.baseUrl}/products/${id}`);
    }

    getAdminOrders(orderStatus: string, page: number, limit: number): Observable<any> {
        return this.http.post<any>(`${this.baseUrl}/orders/getOrders`, { orderStatus, page, limit });
    }

    // Confirmed body shape: { orderId: string (uuid), orderStatus: string }
    approveOrder(orderId: string, orderStatus: string): Observable<any> {
        return this.http.post<any>(`${this.baseUrl}/orders/approveOrder`, { orderId, orderStatus });
    }

    createCategory(name: string): Observable<any> {
        return this.http.post<any>(`${this.baseUrl}/categories`, { name });
    }

    updateCategory(id: number, name: string): Observable<any> {
        return this.http.put<any>(`${this.baseUrl}/categories/${id}`, { name });
    }

    deleteCategory(id: number): Observable<any> {
        return this.http.delete<any>(`${this.baseUrl}/categories/${id}`);
    }

    createBrand(name: string): Observable<any> {
        return this.http.post<any>(`${this.baseUrl}/brands`, { name });
    }

    updateBrand(id: number, name: string): Observable<any> {
        return this.http.put<any>(`${this.baseUrl}/brands/${id}`, { name });
    }

    deleteBrand(id: number): Observable<any> {
        return this.http.delete<any>(`${this.baseUrl}/brands/${id}`);
    }

    getUsers(): Observable<any> {
        return this.http.get<any>(`${this.baseUrl}/user`);
    }

    getUserById(id: number): Observable<any> {
        return this.http.get<any>(`${this.baseUrl}/user/${id}`);
    }

    updateUser(id: number, payload: Record<string, any>): Observable<any> {
        return this.http.put<any>(`${this.baseUrl}/user/${id}`, payload);
    }

    deleteUser(id: number): Observable<any> {
        return this.http.delete<any>(`${this.baseUrl}/user/${id}`);
    }

    loadReport(fromDate: string, toDate: string, page: number, limit: number): Observable<any> {
        return this.http.post<any>(`${this.baseUrl}/sales/report`, { fromDate, toDate, page, limit });
    }
}
