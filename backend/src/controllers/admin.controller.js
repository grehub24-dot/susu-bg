// backend/src/controllers/admin.controller.js
// Re-exports all admin sub-controllers for backward compatibility
const AdminUsersController = require("./admin-users.controller");
const AdminTransactionsController = require("./admin-transactions.controller");
const AdminSusuController = require("./admin-susu.controller");
const AdminComplianceController = require("./admin-compliance.controller");
const AdminRevenueController = require("./admin-revenue.controller");
const AdminBranchesController = require("./admin-branches.controller");
const AdminSystemController = require("./admin-system.controller");

// Collect static methods from each controller class
function collectStaticMethods(ControllerClass) {
  const methods = {};
  for (const key of Object.getOwnPropertyNames(ControllerClass)) {
    if (typeof ControllerClass[key] === "function" && key !== "length" && key !== "name" && key !== "prototype") {
      methods[key] = ControllerClass[key];
    }
  }
  return methods;
}

module.exports = {
  ...collectStaticMethods(AdminUsersController),
  ...collectStaticMethods(AdminTransactionsController),
  ...collectStaticMethods(AdminSusuController),
  ...collectStaticMethods(AdminComplianceController),
  ...collectStaticMethods(AdminRevenueController),
  ...collectStaticMethods(AdminBranchesController),
  ...collectStaticMethods(AdminSystemController),
};
