import { Router } from "express"
import { UserController } from "../controllers/UserController";
import { authentication } from "../middleware/auth";

const router = Router();

const userController = new UserController();

router.post("/users", userController.create);

router.post("/login", userController.authenticate);
router.get("/users/profile", authentication, userController.getUserInfo);

export default router;
