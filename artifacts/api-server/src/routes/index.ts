import { Router, type IRouter } from "express";
import { getSingleValue } from "../lib/getSingleValue";
import healthRouter from "./health";
import usersRouter from "./users";
import exercisesRouter from "./exercises";
import routinesRouter from "./routines";
import workoutsRouter from "./workouts";
import nutritionRouter from "./nutrition";
import socialRouter from "./social";
import notificationsRouter from "./notifications";
import calendarRouter from "./calendar";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(exercisesRouter);
router.use(routinesRouter);
router.use(workoutsRouter);
router.use(nutritionRouter);
router.use(socialRouter);
router.use(notificationsRouter);
router.use(calendarRouter);

export default router;
