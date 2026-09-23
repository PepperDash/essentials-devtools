import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { expect, it } from 'vitest';
import App from './App';
import { store } from './store/store';

it('renders the help page inside the app shell', () => {
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/help']}>
        <App />
      </MemoryRouter>
    </Provider>
  );
  expect(
    screen.getByRole('heading', {
      name: /PepperDash Essentials Web Config App Documentation/i,
    })
  ).toBeInTheDocument();
});
