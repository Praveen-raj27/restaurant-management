
import { createEmployee, getEmployees, updateEmployee, removeEmployee } from "./employee.service.js";

export const addEmployee = async (req, res, next) => {
  try {
    const employee = await createEmployee({
      ...req.body,

      // Always derive tenant from authenticated context
      restaurantId: req.user.restaurantId,
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

    next(error);
  }
};

export const deleteEmployee = async (req, res, next) => {
  try {
    const employee = await removeEmployee({
      employeeId: req.params.id,
      restaurantId: req.user.restaurantId,
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

    next(error);
  }
};