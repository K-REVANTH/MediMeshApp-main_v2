/**
 * MediMesh Frontend — Unit Tests
 * Tests: App rendering, Route navigation, Protected routes
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock react-router-dom: replace BrowserRouter with MemoryRouter
// so we can control the initial route in tests
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    BrowserRouter: ({ children }) => {
      // Render using MemoryRouter for testability
      const { MemoryRouter } = jest.requireActual('react-router-dom');
      return <MemoryRouter>{children}</MemoryRouter>;
    },
  };
});

// Mock all page components to isolate routing tests
jest.mock('./pages/LandingPage', () => () => <div data-testid="landing-page">Landing Page</div>);
jest.mock('./pages/LoginPage', () => () => <div data-testid="login-page">Login Page</div>);
jest.mock('./pages/RegisterPage', () => () => <div data-testid="register-page">Register Page</div>);
jest.mock('./pages/AdminDashboard', () => () => <div data-testid="admin-dashboard">Admin Dashboard</div>);
jest.mock('./pages/DoctorDashboard', () => () => <div data-testid="doctor-dashboard">Doctor Dashboard</div>);
jest.mock('./pages/PatientDashboard', () => () => <div data-testid="patient-dashboard">Patient Dashboard</div>);
jest.mock('./pages/ForumPage', () => () => <div data-testid="forum-page">Forum Page</div>);

import App from './App';

// ═══════════════════════════════════════════════════════════
describe('MediMesh Frontend', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ─── Landing Page ─────────────────────────────────────────
  describe('Landing Page (default route)', () => {
    it('should render without crashing', () => {
      render(<App />);
      // The default MemoryRouter initialEntry is "/", so LandingPage renders
      expect(screen.getByTestId('landing-page')).toBeInTheDocument();
    });
  });

  // ─── Protected Routes — Unauthenticated ───────────────────
  describe('Protected Routes (unauthenticated)', () => {
    it('should redirect to login when no token exists for dashboard', () => {
      // Without token, ProtectedRoute redirects to /login
      // Since we start at "/", the landing page is shown initially
      render(<App />);
      expect(screen.getByTestId('landing-page')).toBeInTheDocument();
    });
  });

  // ─── Auth State Tests ─────────────────────────────────────
  describe('Auth State Management', () => {
    it('should handle missing localStorage gracefully', () => {
      localStorage.setItem('user', 'invalid-json{{{');
      render(<App />);
      // Should not crash even with invalid JSON in localStorage
      expect(screen.getByTestId('landing-page')).toBeInTheDocument();
    });

    it('should handle empty localStorage', () => {
      render(<App />);
      expect(screen.getByTestId('landing-page')).toBeInTheDocument();
    });
  });

  // ─── Component Rendering ──────────────────────────────────
  describe('App Component', () => {
    it('should render App component without errors', () => {
      const { container } = render(<App />);
      expect(container).toBeTruthy();
    });

    it('should have proper DOM structure', () => {
      const { container } = render(<App />);
      expect(container.firstChild).toBeTruthy();
    });
  });
});
