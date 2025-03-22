import { Database } from 'bun:sqlite'
import { Hono } from 'hono'
import { swaggerUI } from '@hono/swagger-ui'
import Bun from 'bun'

const db = new Database('db.sqlite')

db.run(`

    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL, 
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        time INTEGER NOT NULL,
        day INTEGER NOT NULL
        );

`)


const app = new Hono()

app.get('/ui', swaggerUI({ url: '/doc' }))

app.get('/doc', async (c) => {
    return c.text(await Bun.file('ui.yaml').text())
})

app.get('/super', async (c) => {
    const stmt = db.prepare('SELECT * FROM users')
    const users = stmt.all()
    return c.json(users)
})

app.post('/signup', async (c) => {
    try {
        const data = await c.req.json()
        const { name, email, password } = data

        if (!name || !email || !password) {
            return c.json({ message: 'Missing required fields' }, 400)
        }

        const sameUser = db.prepare('SELECT COUNT(*) as count FROM users WHERE email = ?')
        const res = sameUser.get(email) as { count: number }

        if (res.count > 0) {
            return c.json({ message: 'User already exists' }, 400)
        }

        const stmt = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)')
        stmt.run(name, email, password)

        return c.json({ message: 'User created successfully' }, 201)
    } catch (error) {
        console.error('Signup error:', error)
        return c.json({ message: 'Internal server error' }, 500)
    }
})

app.post('/signin', async (c) => {
    try {
        const data = await c.req.json()
        const { email, password } = data

        if (!email || !password) {
            return c.json({ message: 'Missing email or password' }, 400)
        }

        const userStmt = db.prepare('SELECT * FROM users WHERE email = ?')
        const user = userStmt.get(email) as { id: number; name: string; email: string; password: string } | undefined

        if (!user) {
            return c.json({ message: 'User not found' }, 404)
        }

        if (user.password !== password) {
            return c.json({ message: 'Invalid credentials' }, 401)
        }

        return c.json(
            {
                message: 'Authentication successful',
                user: { id: user.id, name: user.name, email: user.email },
            },
            200
        )
    } catch (error) {
        console.error('Signin error:', error)
        return c.json({ message: 'Internal server error' }, 500)
    }
})

app.get('/todos', async (c) => {
    try {
        const stmt = db.prepare('SELECT * FROM todos')
        const todos = stmt.all()
        return c.json(todos)
    } catch (error) {
        console.error('Get todos error:', error)
        return c.json({ message: 'Internal server error' }, 500)
    }
})

app.post('/todos', async (c) => {
    try {
        const data = await c.req.json()
        const { name, type, time, day } = data

        if (!name || !type || !time || !day) {
            return c.json({ message: 'Missing required fields' }, 400)
        }

        const stmt = db.prepare('INSERT INTO todos (name, type, time, day) VALUES (?, ?, ?, ?)')
        stmt.run(name, type, time, day)
        return c.json({ message: 'Todo created' }, 200)
    } catch (error) {
        console.error('Post todos error:', error)
        return c.json({ message: 'Internal server error' }, 500)
    }
})

app.delete('/todos', async (c) => {
    try {
        const data = await c.req.json()
        const { id } = data

        if (!id) {
            return c.json({ message: 'Missing required fields' }, 400)
        }

        const stmt = db.prepare('DELETE FROM todos WHERE id = ?')
        stmt.run(id)
        return c.json({ message: 'Todo deleted' }, 200)
    }
    catch (error) {
        console.error('Delete todos error:', error)
        return c.json({ message: 'Internal server error' }, 500)
    }
})

app.delete('/user', async (c) => {
    try {
        const data = await c.req.json()
        const { email, password } = data

        if (!email || !password) {
            return c.json({ message: 'Missing email or password' }, 400)
        }

        const userStmt = db.prepare('SELECT * FROM users WHERE email = ?')
        const user = userStmt.get(email) as { id: number; name: string; email: string; password: string } | undefined

        if (!user) {
            return c.json({ message: 'User not found' }, 404)
        }

        if (user.password !== password) {
            return c.json({ message: 'Invalid credentials' }, 401)
        }

        const deleteStmt = db.prepare('DELETE FROM users WHERE email = ?')
        const result = deleteStmt.run(email)

        if (result.changes === 0) {
            return c.json({ message: 'Failed to delete user' }, 500)
        }

        return c.json({ message: 'User deleted successfully' }, 200)
    } catch (error) {
        console.error('Delete user error:', error)
        return c.json({ message: 'Internal server error' }, 500)
    }
})

Bun.serve({
     fetch: app.fetch,
    port: process.env.PORT || 3000,
})

console.log(`Running on port ${process.env.PORT || 3000}`)
