import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { getCurrentUser, signIn, signOut, confirmSignIn, type SignInInput } from 'aws-amplify/auth';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="!isAuthenticated" class="auth-container">
      <h3>Sign In to Send IoT Commands</h3>
      <form *ngIf="!needsNewPassword" (ngSubmit)="onSignIn()" #signInForm="ngForm">
        <div class="form-group">
          <label for="email">Email:</label>
          <input
            type="email"
            id="email"
            [(ngModel)]="email"
            name="email"
            required
            #emailInput="ngModel"
          >
        </div>
        <div class="form-group">
          <label for="password">Password:</label>
          <input
            type="password"
            id="password"
            [(ngModel)]="password"
            name="password"
            required
            #passwordInput="ngModel"
          >
        </div>
        <button type="submit" [disabled]="!signInForm.form.valid || isLoading">
          {{ isLoading ? 'Signing In...' : 'Sign In' }}
        </button>
      </form>

      <form *ngIf="needsNewPassword" (ngSubmit)="onConfirmNewPassword()" #newPasswordForm="ngForm">
        <div class="form-group">
          <label for="newPassword">New Password:</label>
          <input
            type="password"
            id="newPassword"
            [(ngModel)]="newPassword"
            name="newPassword"
            required
            minlength="8"
            #newPasswordInput="ngModel"
          >
        </div>
        <button type="submit" [disabled]="!newPasswordForm.form.valid || isLoading">
          {{ isLoading ? 'Submitting...' : 'Submit New Password' }}
        </button>
      </form>

      <p *ngIf="errorMessage" class="error">{{ errorMessage }}</p>
    </div>

    <div *ngIf="isAuthenticated" class="auth-status">
      <p>Signed in as: {{ user?.username || user?.signInDetails?.loginId || 'authenticated user' }}</p>
      <button (click)="onSignOut()">Sign Out</button>
    </div>
  `,
  styles: [`
    .auth-container {
      border: 1px solid #ccc;
      padding: 20px;
      margin: 20px 0;
      border-radius: 8px;
      background-color: #f9f9f9;
    }
    .form-group {
      margin-bottom: 15px;
    }
    .form-group label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
    }
    .form-group input {
      width: 100%;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-sizing: border-box;
    }
    button {
      background-color: #007bff;
      color: white;
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    button:hover:not(:disabled) {
      background-color: #0056b3;
    }
    button:disabled {
      background-color: #ccc;
      cursor: not-allowed;
    }
    .error {
      color: red;
      margin-top: 10px;
    }
    .auth-status {
      background-color: #e8f5e8;
      padding: 10px;
      border-radius: 4px;
      margin: 10px 0;
    }
  `]
})
export class AuthComponent implements OnInit {
  isAuthenticated = false;
  isLoading = false;
  user: any = null;
  email = '';
  password = '';
  newPassword = '';
  needsNewPassword = false;
  pendingSignInResult: any = null;
  errorMessage = '';

  ngOnInit() {
    this.checkAuthState();
  }

  async checkAuthState() {
    try {
      this.user = await getCurrentUser();
      this.isAuthenticated = true;
    } catch (error) {
      this.isAuthenticated = false;
      this.user = null;
    }
  }

  async onSignIn() {
    if (!this.email || !this.password) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.needsNewPassword = false;
    this.pendingSignInResult = null;

    try {
      const signInInput: SignInInput = {
        username: this.email,
        password: this.password,
      };

      const signInResult = await signIn(signInInput);
      console.log('Sign in result', signInResult);

      if (!signInResult.isSignedIn) {
        const nextStep = (signInResult.nextStep as any)?.signInStep ||
                         (signInResult.nextStep as any)?.challengeName ||
                         'additional authentication required';

        if (nextStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
          this.needsNewPassword = true;
          this.pendingSignInResult = signInResult;
          this.errorMessage = 'A new password is required. Please enter a new password below.';
          return;
        }

        this.errorMessage = `Sign in requires additional steps: ${nextStep}`;
        return;
      }

      await this.checkAuthState();
      this.email = '';
      this.password = '';
    } catch (error: any) {
      this.errorMessage = error?.message || 'Sign in failed';
      console.error('Sign in error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async onConfirmNewPassword() {
    if (!this.newPassword || !this.pendingSignInResult) return;

    this.isLoading = true;
    this.errorMessage = '';

    try {
      await confirmSignIn({
        challengeResponse: this.newPassword,
      });

      this.pendingSignInResult = null;
      this.needsNewPassword = false;
      this.newPassword = '';
      this.errorMessage = '';

      await this.checkAuthState();
    } catch (error: any) {
      this.errorMessage = error?.message || 'Unable to confirm new password';
      console.error('Confirm new password error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async onSignOut() {
    try {
      await signOut();
      await this.checkAuthState();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }
}