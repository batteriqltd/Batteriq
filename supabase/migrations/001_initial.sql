-- ============================================================
-- BATTERIQ — Initial Schema Migration
-- Run this first in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PRODUCTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku                 TEXT UNIQUE NOT NULL,
  brand               TEXT NOT NULL CHECK (brand IN ('EcoFlow', 'Bluetti')),
  category            TEXT NOT NULL CHECK (category IN ('Power Stations', 'Solar Panels', 'Accessories', 'Batteries', 'Appliances', 'Solar Home Systems', 'Power Banks')),
  subcategory         TEXT,
  name                TEXT NOT NULL,
  slug                TEXT UNIQUE NOT NULL,
  description         TEXT,
  specs               JSONB NOT NULL DEFAULT '{}',
  images              TEXT[] NOT NULL DEFAULT '{}',
  price_kes           NUMERIC(12,2) NOT NULL,
  compare_price_kes   NUMERIC(12,2),
  discount_percent    NUMERIC(5,2) DEFAULT 0,
  discount_badge      TEXT,
  in_stock            BOOLEAN DEFAULT true,
  stock_qty           INTEGER DEFAULT 0,
  featured            BOOLEAN DEFAULT false,
  sort_order          INTEGER DEFAULT 0,
  meta_title          TEXT,
  meta_description    TEXT,
  schema_rating       NUMERIC(3,2) DEFAULT 4.8,
  schema_review_count INTEGER DEFAULT 12,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ORDERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number              TEXT UNIQUE NOT NULL,
  user_id                   uuid REFERENCES auth.users(id),
  guest_email               TEXT,
  guest_name                TEXT,
  guest_phone               TEXT,
  items                     JSONB NOT NULL,
  subtotal_kes              NUMERIC(12,2) NOT NULL,
  total_kes                 NUMERIC(12,2) NOT NULL,
  payment_method            TEXT NOT NULL CHECK (payment_method IN ('mpesa_now','cod_cash','cod_mpesa')),
  payment_status            TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed','refunded')),
  fulfillment_status        TEXT DEFAULT 'unfulfilled' CHECK (fulfillment_status IN ('unfulfilled','processing','shipped','delivered','cancelled')),
  delivery_address          JSONB,
  mpesa_checkout_request_id TEXT,
  mpesa_transaction_code    TEXT,
  notes                     TEXT,
  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- AI CHAT SESSIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_chat_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token   TEXT UNIQUE NOT NULL,
  user_id         uuid REFERENCES auth.users(id),
  guest_name      TEXT,
  messages        JSONB NOT NULL DEFAULT '[]',
  order_generated uuid REFERENCES orders(id),
  started_at      TIMESTAMPTZ DEFAULT now(),
  last_active     TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ADMIN USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id         uuid PRIMARY KEY REFERENCES auth.users(id),
  role       TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('super_admin','staff')),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- NEWSLETTER SUBSCRIBERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  name          TEXT,
  subscribed_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PRICE AUDIT LOG TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS price_audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid REFERENCES products(id),
  old_price   NUMERIC(12,2),
  new_price   NUMERIC(12,2),
  changed_by  uuid REFERENCES auth.users(id),
  reason      TEXT,
  changed_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_audit_log ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users WHERE id = auth.uid()
  );
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- PRODUCTS POLICIES
CREATE POLICY "Public can view in-stock products"
  ON products FOR SELECT
  USING (in_stock = true);

CREATE POLICY "Admins can view all products"
  ON products FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can insert products"
  ON products FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update products"
  ON products FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete products"
  ON products FOR DELETE
  USING (is_admin());

-- ORDERS POLICIES
CREATE POLICY "Users can view their own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all orders"
  ON orders FOR SELECT
  USING (is_admin());

CREATE POLICY "Anyone can create orders"
  ON orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can update orders"
  ON orders FOR UPDATE
  USING (is_admin());

-- AI CHAT SESSIONS POLICIES
CREATE POLICY "Anyone can manage their chat session by token"
  ON ai_chat_sessions FOR ALL
  USING (true);

-- ADMIN USERS POLICIES
CREATE POLICY "Admins can view admin list"
  ON admin_users FOR SELECT
  USING (is_admin());

-- NEWSLETTER POLICIES
CREATE POLICY "Anyone can subscribe"
  ON newsletter_subscribers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view subscribers"
  ON newsletter_subscribers FOR SELECT
  USING (is_admin());

-- PRICE AUDIT POLICIES
CREATE POLICY "Admins can view price audit log"
  ON price_audit_log FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can insert price audit log"
  ON price_audit_log FOR INSERT
  WITH CHECK (is_admin());

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_sort_order ON products(sort_order);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_mpesa_checkout ON orders(mpesa_checkout_request_id);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_token ON ai_chat_sessions(session_token);
