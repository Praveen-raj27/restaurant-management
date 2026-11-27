
import {
  createEmployee,
  getEmployees,
  updateEmployee,
  removeEmployee,
} from "./employee.service.js";

export const addEmployee = async (req, res, next) => {
  try {
    const employee = await createEmployee({
      ...req.body,
      restaurantId: req.user.restaurantId,
      actorRole: req.user.role,
    });

    return res.status(201).json({
      success: true,
      message: "Employee created successfully",
      data: employee,
    });
  } catch (error) {
    if (error.message === "ROLE_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "The requested role does not exist in this restaurant",
      });
    }

    if (error.message === "OWNER_ROLE_NOT_ALLOWED") {
      return res.status(403).json({
        success: false,
        message: "Cannot assign OWNER role through employee creation",
      });
    }

    if (error.message === "MANAGER_ROLE_ASSIGNMENT_FORBIDDEN") {
      return res.status(403).json({
        success: false,
        message: "Only OWNER can assign the MANAGER role",
      });
    }

    if (error.message === "EMAIL_ALREADY_EXISTS") {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    next(error);
  }
};

export const listEmployees = async (req, res, next) => {
  try {
    const { page, limit, search, role, status } = req.validatedQuery;

    const result = await getEmployees({
      restaurantId: req.user.restaurantId,
      page,
      limit,
      search,
      role,
      status,
    });

    return res.status(200).json({
      success: true,
      message: "Employees retrieved successfully",
      data: result.employees,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const editEmployee = async (req, res, next) => {
  try {
    const employee = await updateEmployee({
      employeeId: req.params.id,
      restaurantId: req.user.restaurantId,
      actorId: req.user.id,
      actorRole: req.user.role,
      updates: req.validatedBody,
    });

    return res.status(200).json({
      success: true,
      message: "Employee updated successfully",
      data: employee,
    });
  } catch (error) {
    if (error.message === "EMPLOYEE_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    if (error.message === "ROLE_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Role not found in this restaurant",
      });
    }

    if (error.message === "EMAIL_ALREADY_EXISTS") {
      return res.status(409).json({
        success: false,
        message: "Email address is already registered",
      });
    }

    if (
      error.message === "SELF_MANAGEMENT_NOT_ALLOWED" ||
      error.message === "FORBIDDEN_EMPLOYEE_MANAGEMENT" ||
      error.message === "MANAGER_ROLE_ASSIGNMENT_FORBIDDEN"
    ) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this employee management action",
      });
    }

    next(error);
  }
};

export const deleteEmployee = async (req, res, next) => {
  try {
    const employee = await removeEmployee({
      employeeId: req.params.id,
      restaurantId: req.user.restaurantId,
      actorId: req.user.id,
      actorRole: req.user.role,
    });

    return res.status(200).json({
      success: true,
      message: "Employee removed successfully",
      data: employee,
    });
  } catch (error) {
    if (error.message === "EMPLOYEE_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    if (
      error.message === "SELF_MANAGEMENT_NOT_ALLOWED" ||
      error.message === "FORBIDDEN_EMPLOYEE_MANAGEMENT"
    ) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this employee management action",
      });
    }

    next(error);
  }
};
