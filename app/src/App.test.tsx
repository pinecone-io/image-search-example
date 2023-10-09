import { render, screen } from '@testing-library/react';

import App from './App';

describe('App', () => {
  it('renders headline', () => {
    // PREPERE
    render(<App />);

    // ACT
    
    // EXPECT
    expect(screen.getByText('Image Search')).toBeTruthy()

  });
});