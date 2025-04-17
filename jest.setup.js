import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

// Mock next/router
const mockRouter = {
  route: '/',
  pathname: '',
  query: {},
  asPath: '',
  push: jest.fn(),
  replace: jest.fn(),
};

export const useRouter = () => mockRouter; 