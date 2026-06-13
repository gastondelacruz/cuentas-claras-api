// Re-exports the detail read-model types that are declared as part of the
// GroupRepository port contract. Application-layer consumers (use cases, tests)
// import from here to keep their imports in the application layer.
export type {
	GroupBalanceReadModel,
	GroupDetailReadModel,
	GroupExpenseReadModel,
	GroupMemberReadModel,
} from "../../domain/ports/group.repository";
