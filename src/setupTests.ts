// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
import '@testing-library/jest-dom';

// Mock implementation of server handlers
const server = {
  listen: () => console.log('Mock server listening'),
  resetHandlers: () => console.log('Mock server reset'),
  close: () => console.log('Mock server closed')
};

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());