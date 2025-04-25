import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from 'src/schemas/user.schema';
import { Admin } from 'src/schemas/admin.schema';
import { SignupDto } from '../dtos/signup.dto';
import * as bcrypt from 'bcrypt';
import { updateUserDto } from 'src/dtos/updateUser.dto';
import { Model, isValidObjectId, Types } from 'mongoose';
import { Doctor } from 'src/schemas/doctor.schema';
import { JwtService } from '@nestjs/jwt';
import { loginDto } from 'src/dtos/login.dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private UserModel: Model<User>,
    @InjectModel(Admin.name) private AdminModel: Model<Admin>,
    @InjectModel(Doctor.name) private DoctorModel: Model<Doctor>,
    private cloudinaryService: CloudinaryService,
    private jwtService: JwtService,
  ) { }

  async getUsers() {
    return await this.UserModel.find();
  }

  async getUserByID(id: string) {
    return await this.UserModel.findById(id);
  }

  async getDoctors() {
    return await this.DoctorModel.find();
  }

  async postAdmin(signUpData: SignupDto) {
    const { email, password, name, phone } = signUpData;

    const emailInUse = await this.AdminModel.findOne({ email });
    if (emailInUse) {
      throw new BadRequestException('Email already in use');
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    await this.AdminModel.create({
      email,
      password: hashedPassword,
      name,
      phone,
    });

    return { message: 'Admin created successfully' };
  }

  async updateUser(id: string, updateData: any) {
    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid ID format');
    }

    const objectId = new Types.ObjectId(id);

    // Check if the user exists
    const user = await this.UserModel.findById(objectId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prepare the update object
    const updateFields: Partial<updateUserDto> = {};

    if (updateData.email) updateFields.email = updateData.email;
    if (updateData.name) updateFields.name = updateData.name;
    if (updateData.phone) updateFields.phone = updateData.phone;
    // 🔥 Chỉ mã hóa nếu mật khẩu thực sự thay đổi
    if (
      updateData.password &&
      updateData.password.trim() !== '' &&
      updateData.password !== user.password
    ) {
      updateFields.password = await bcrypt.hash(updateData.password, 10);
    } else {
      updateFields.password = user.password; //Giữ nguyên mật khẩu cũ, không mã hóa lại!
    }

    if (updateData.userImage) {
      const upload = await this.cloudinaryService.uploadFile(updateData.userImage, `Users/${id}/Avatar`);
      updateFields.userImage = upload.secure_url;
    }

    let roleChanged = false;
    let newRole = user.role; // Giữ nguyên role cũ mặc định

    if (updateData.role && updateData.role !== user.role) {
      roleChanged = true;
      newRole = updateData.role;
    }

    // Nếu không có trường nào thay đổi, trả về thông báo
    if (Object.keys(updateFields).length === 0 && !roleChanged) {
      return { message: 'No changes detected' };
    }

    // Cập nhật user trong UserModel
    const updatedUser = await this.UserModel.findByIdAndUpdate(
      objectId,
      { $set: updateFields },
      { new: true },
    );

    if (!updatedUser) {
      throw new NotFoundException('Update failed, user not found');
    }

    // Nếu role thay đổi, xử lý cập nhật trong collection tương ứng
    if (roleChanged) {
      await this.handleRoleUpdate(objectId, user.role, newRole, updatedUser);
    }

    return { message: 'User updated successfully', user: updatedUser };
  }

  private async handleRoleUpdate(
    userId: Types.ObjectId,
    oldRole: string,
    newRole: string,
    userData: any,
  ) {
    const existingPassword = userData.password;

    // Xóa user khỏi collection cũ nếu cần
    if (oldRole === 'admin') {
      await this.AdminModel.findOneAndDelete({ userId });
    } else if (oldRole === 'doctor') {
      await this.DoctorModel.findOneAndDelete({ userId });
    } else {
      await this.UserModel.findOneAndDelete({ userId });
    }
    // Thêm vào collection mới nếu role thay đổi
    if (newRole === 'admin') {
      await this.AdminModel.create({
        userId,
        name: userData.name,
        email: userData.email,
        phone: userData.phone, // Đảm bảo có phone
        password: existingPassword, // Đảm bảo có password
      });
      await this.UserModel.findByIdAndDelete(userId);
    } else if (newRole === 'doctor') {
      await this.DoctorModel.create({
        userId,
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        password: existingPassword,
      });
      await this.UserModel.findByIdAndDelete(userId);
    } else if (newRole === 'user') {
      // Xóa tài khoản khỏi AdminModel / DoctorModel
      await this.AdminModel.findOneAndDelete({ userId });
      await this.DoctorModel.findOneAndDelete({ userId });

      // Tạo lại tài khoản trong UserModel
      await this.UserModel.create({
        _id: userId, // Đặt lại ID cũ
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        password: existingPassword,
        role: 'user', // Đảm bảo đúng role
      });
    }
  }

  async generateAdminTokens(userId, email, name, role) {
    const accessToken = this.jwtService.sign(
      { userId, email, name, role },
      { expiresIn: '1d' },
    );
    return {
      accessToken,
    };
  }

  async deleteUser(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ID format');
    }
    const user = await this.UserModel.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.UserModel.findByIdAndDelete(id);
    return { message: 'User deleted successfully' };
  }

  async deleteDoctor(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ID format');
    }
    const doctor = await this.DoctorModel.findById(id);
    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }
    await this.DoctorModel.findByIdAndDelete(id);
    return { message: 'Doctor deleted successfully' };
  }

  getUser(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ID format');
    }
    return this.UserModel.findById(id);
  }
}
