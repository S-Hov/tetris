INSERT INTO roles (key, name)
VALUES
    ('user', 'User'),
    ('admin', 'Admin')
ON CONFLICT (key) DO UPDATE
SET name = EXCLUDED.name;
