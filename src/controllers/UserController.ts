import { compare, hash } from "bcryptjs"
import { Request, Response } from "express"
import { v4 as uuid } from "uuid"
import { createConnection } from "../postgres"
import { sign } from "jsonwebtoken";
import { setRedis, getRedis } from "../redisConfig";

type User = {
    id: string;
    username: string;
    password: string;
    name: string;
};

export class UserController {
    async create(request: Request, response: Response) {
        const { username, name, password } = request.body;

        const clientConnection = await createConnection();

        const { rows } = await clientConnection.query(
            `SELECT * FROM USERS WHERE USERNAME  = $1 LIMIT 1`,
            [username]
        );

        const userExists = rows[0];

        if (userExists) {
            return response.status(400).json({ error: "User already exists" });
        }

        const passwordHash = await hash(password, 8);

        const id = uuid();

        const user = await clientConnection.query(
            `INSERT INTO USERS(ID,NAME,USERNAME,PASSWORD) VALUES($1,$2,$3,$4)`,
            [id, name, username, passwordHash]
        );

        return response.status(200).json(user);
    }

    async authenticate(request: Request, response: Response) {
        const { username, password } = request.body;

        const clientConnection = await createConnection();

        const { rows } = await clientConnection.query(
            `SELECT * FROM USERS WHERE USERNAME  = $1 LIMIT 1`,
            [username]
        );

        if (!rows[0]) {
            return response.status(401).end();
        }

        const user: User = rows[0];

        const passwordMatch = await compare(password, user.password);

        if (!passwordMatch) {
            return response.status(401).end();
        }

        const token = sign({}, process.env.JWT_SECRET, {
            subject: user.id,
        });

        await setRedis(`user-${user.id}`, JSON.stringify(user));

        return response.json(token);
    }

    async getUserInfo(request: Request, response: Response) {
        const { userId } = request;

        const userRedis = await getRedis(`user-${userId}`);
        const user = JSON.parse(userRedis);

        if (user == null) {
            const clientConnection = await createConnection();
            const { rows } = await clientConnection.query(
              `SELECT * FROM USERS WHERE ID  = $1 LIMIT 1`,
              [userId]
            );

            return response.json(rows[0]);
        }

        return response.json(user);
    }
}
