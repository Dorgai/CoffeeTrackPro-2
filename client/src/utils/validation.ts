export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPassword(password: string): boolean {
  return password.length >= 8;
}

export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s-]{10,}$/;
  return phoneRegex.test(phone);
}

export function isValidPostalCode(postalCode: string): boolean {
  const postalCodeRegex = /^\d{5}(-\d{4})?$/;
  return postalCodeRegex.test(postalCode);
}

export function isValidWeight(weight: number): boolean {
  return weight > 0 && weight <= 1000;
}

export function isValidPrice(price: number): boolean {
  return price >= 0 && price <= 1000000;
}

export function isValidQuantity(quantity: number): boolean {
  return quantity >= 0 && quantity <= 10000;
}

export function isValidPercentage(value: number): boolean {
  return value >= 0 && value <= 1;
} 