import { User } from "@prisma/client";
import JWT from "jsonwebtoken";

const JWT_Secret = "fsd73fsd58g1fgdgf";

class JWTService {
  public static generateTokenForUser(user: User) {
    const payload = {
      id: user?.id,
      email: user?.email,
    };
    const token = JWT.sign(payload, JWT_Secret);
    return token;
  }
}

export default JWTService;
