-- Expenses table for clinic/pharmacy operations.

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  facility_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  portal TEXT NOT NULL CHECK (portal IN ('clinic', 'pharmacy')) DEFAULT 'clinic',
  category TEXT NOT NULL,
  amount_kes DECIMAL(12, 2) NOT NULL,
  notes TEXT,
  expense_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_facility_id ON expenses(facility_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date DESC);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read expenses" ON expenses;
CREATE POLICY "Allow public read expenses" ON expenses
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert expenses" ON expenses;
CREATE POLICY "Allow public insert expenses" ON expenses
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update expenses" ON expenses;
CREATE POLICY "Allow public update expenses" ON expenses
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete expenses" ON expenses;
CREATE POLICY "Allow public delete expenses" ON expenses
  FOR DELETE USING (true);

