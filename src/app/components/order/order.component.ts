import { Component, OnInit } from '@angular/core';
import { Product } from '../models/product';
import { CartService } from '../../services/cart.service';
import { ProductService } from '../../services/product.service';
import { OrderService } from '../../services/order.service';
import { TokenService } from '../../services/token.service';
import { environment } from '../../environments/environments';
import { OrderDTO } from '../../dtos/user/order/order.dto';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-order',
  templateUrl: './order.component.html',
  styleUrls: ['./order.component.scss'],
})
export class OrderComponent implements OnInit {
  orderForm: FormGroup;
  cartItems: { product: Product; quantity: number }[] = [];
  totalAmount: number = 0;
  orderData: OrderDTO = {
    user_id: 0,
    fullname: '',
    email: '',
    phone_number: '',
    address: '',
    note: '',
    total_money: 0,
    payment_method: 'cod',
    shipping_method: 'express',
    coupon_code: '',
    cart_items: [],
  };

  constructor(
    private cartService: CartService,
    private productService: ProductService,
    private orderService: OrderService,
    private tokenService: TokenService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.orderForm = this.fb.group({
      fullname: ['', Validators.required],
      email: ['', [Validators.email]],
      phone_number: ['', [Validators.required, Validators.minLength(6)]],
      address: ['', [Validators.required, Validators.minLength(5)]],
      note: [''],
      shipping_method: ['express'],
      payment_method: ['cod'],
    });
  }

  ngOnInit(): void {
    this.orderData.user_id = this.tokenService.getUserId();

    const cart = this.cartService.getCart();
    const productIds = Array.from(cart.keys());

    if (productIds.length === 0) {
      return;
    }
    this.productService.getProductsByIds(productIds).subscribe({
      next: (products) => {
        this.cartItems = productIds.map((productId) => {
          const product = products.find((p) => p.id === productId);
          if (product) {
            product.thumbnail = `${environment.apiBaseUrl}/products/images/${product.thumbnail}`;
          }
          return {
            product: product!,
            quantity: cart.get(productId)!,
          };
        });
      },
      complete: () => {
        this.calculateTotal();
      },
      error: (error: any) => {
        console.error('Error fetching detail:', error);
      },
    });
  }

  placeOrder() {
    if (this.cartItems.length === 0) {
      alert(
        'Không có sản phẩm nào trong giỏ hàng. Vui lòng thêm sản phẩm trước khi đặt hàng.'
      );
      return; // Dừng lại nếu giỏ hàng trống
    }

    if (this.orderForm.valid) {
      this.orderData = {
        ...this.orderData,
        ...this.orderForm.value,
      };
      this.orderData.cart_items = this.cartItems.map((cartItem) => ({
        product_id: cartItem.product.id,
        quantity: cartItem.quantity,
      }));
      this.orderData.total_money = this.totalAmount;

      this.orderService.placeOrder(this.orderData).subscribe({
        next: (response) => {
          alert('Đặt hàng thành công');
          this.cartService.clearCart();
          this.router.navigate(['/']);
        },
        complete: () => {
          this.calculateTotal();
        },
        error: (error: any) => {
          alert(`Lỗi khi đặt hàng: ${error}`);
        },
      });
    } else {
      alert('Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.');
    }
  }

  calculateTotal(): void {
    this.totalAmount = this.cartItems.reduce(
      (total, item) => total + item.product.price * item.quantity,
      0
    );
  }

  removeFromCart(index: number): void {
    const productId = this.cartItems[index].product.id;
    this.cartService.removeFromCart(productId);
    this.cartItems.splice(index, 1);
    this.calculateTotal();
  }

  applyCoupon(): void {}
}
