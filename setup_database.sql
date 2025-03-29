-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL,
    isActive BOOLEAN DEFAULT true,
    isPendingApproval BOOLEAN DEFAULT false,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create shops table
CREATE TABLE IF NOT EXISTS shops (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create greenCoffee table
CREATE TABLE IF NOT EXISTS greenCoffee (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    origin VARCHAR(255),
    grade VARCHAR(50),
    price DECIMAL(10,2),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    shopId INT,
    status VARCHAR(50) NOT NULL,
    orderDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deliveryDate TIMESTAMP,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (shopId) REFERENCES shops(id)
);

-- Create orderItems table
CREATE TABLE IF NOT EXISTS orderItems (
    id INT AUTO_INCREMENT PRIMARY KEY,
    orderId INT,
    greenCoffeeId INT,
    smallBags INT,
    largeBags INT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (orderId) REFERENCES orders(id),
    FOREIGN KEY (greenCoffeeId) REFERENCES greenCoffee(id)
);

-- Create roastingBatches table
CREATE TABLE IF NOT EXISTS roastingBatches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    greenCoffeeId INT,
    roastDate TIMESTAMP,
    smallBags INT,
    largeBags INT,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (greenCoffeeId) REFERENCES greenCoffee(id)
);

-- Create retailInventories table
CREATE TABLE IF NOT EXISTS retailInventories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    shopId INT,
    greenCoffeeId INT,
    smallBags INT,
    largeBags INT,
    updatedById INT,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updateType VARCHAR(50),
    notes TEXT,
    FOREIGN KEY (shopId) REFERENCES shops(id),
    FOREIGN KEY (greenCoffeeId) REFERENCES greenCoffee(id),
    FOREIGN KEY (updatedById) REFERENCES users(id)
);

-- Create billingEvents table
CREATE TABLE IF NOT EXISTS billingEvents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cycleStartDate TIMESTAMP,
    cycleEndDate TIMESTAMP,
    createdById INT,
    primarySplitPercentage DECIMAL(5,2),
    secondarySplitPercentage DECIMAL(5,2),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (createdById) REFERENCES users(id)
);

-- Create billingEventDetails table
CREATE TABLE IF NOT EXISTS billingEventDetails (
    id INT AUTO_INCREMENT PRIMARY KEY,
    billingEventId INT,
    shopName VARCHAR(255),
    grade VARCHAR(50),
    smallBagsQuantity INT,
    largeBagsQuantity INT,
    FOREIGN KEY (billingEventId) REFERENCES billingEvents(id)
);

-- Create userShopAssignments table
CREATE TABLE IF NOT EXISTS userShopAssignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT,
    shopId INT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id),
    FOREIGN KEY (shopId) REFERENCES shops(id)
);

-- Insert default admin user
INSERT INTO users (username, password, email, role, isActive, isPendingApproval) 
VALUES ('admin', '$2b$10$YourHashedPasswordHere', 'admin@example.com', 'admin', true, false); 