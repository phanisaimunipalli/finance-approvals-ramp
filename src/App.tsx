import { Fragment, useCallback, useEffect, useMemo, useState } from "react"
import { InputSelect } from "./components/InputSelect"
import { Instructions } from "./components/Instructions"
import { Transactions } from "./components/Transactions"
import { useEmployees } from "./hooks/useEmployees"
import { usePaginatedTransactions } from "./hooks/usePaginatedTransactions"
import { useTransactionsByEmployee } from "./hooks/useTransactionsByEmployee"
import { EMPTY_EMPLOYEE } from "./utils/constants"
import { Employee, Transaction } from "./utils/types"

export function App() {
  const { data: employees, ...employeeUtils } = useEmployees()
  const { data: paginatedTransactions, ...paginatedTransactionsUtils } = usePaginatedTransactions()
  const { data: transactionsByEmployee, ...transactionsByEmployeeUtils } = useTransactionsByEmployee()
  const [isLoading, setIsLoading] = useState(false)
  // Bug 7 - Initialize originalTransactions and filteredTransactions
  // Store the original value of transactions in a separate state before filtering it by employee
  const [originalTransactions, setOriginalTransactions] = useState<Transaction[] | null>(null)
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[] | null>(null)


  const transactions = useMemo(
    () =>
      paginatedTransactions?.data??
      transactionsByEmployee ??
      filteredTransactions, 
    [paginatedTransactions, transactionsByEmployee, filteredTransactions]
  );

  
  const loadAllTransactions = useCallback(async () => {
    setIsLoading(true)
    transactionsByEmployeeUtils.invalidateData()
    await employeeUtils.fetchAll()
    // Bug 7 - Store the current value of transactions in originalTransactions
    setOriginalTransactions(transactions);
    // Bug 5 - Part 1 & Part 2 - Fixed 
    // Turned off loading before paginatedTransactions since employees were loaded already.
    setIsLoading(false) 
    await paginatedTransactionsUtils.fetchAll()
    
  
  }, [employeeUtils, paginatedTransactionsUtils, transactionsByEmployeeUtils, transactions])

  const loadTransactionsByEmployee = useCallback(
    async (employeeId: string) => {
      paginatedTransactionsUtils.invalidateData()
      // Bug 7 - Set originalTransactions to the current value of transactions
      setOriginalTransactions(transactions)
      await transactionsByEmployeeUtils.fetchById(employeeId)
    },
    [paginatedTransactionsUtils, transactionsByEmployeeUtils, transactions]
  )

  useEffect(() => {
    if (employees === null && !employeeUtils.loading) {
      loadAllTransactions()
    }
  }, [employeeUtils.loading, employees, loadAllTransactions])

  return (
    <Fragment>
      <main className="MainContainer">
        <Instructions />

        <hr className="RampBreak--l" />

    
        <InputSelect<Employee> 
          isLoading={isLoading}
          defaultValue={EMPTY_EMPLOYEE}
          items={employees === null ? [] : [EMPTY_EMPLOYEE, ...employees]}
          label="Filter by employee"
          loadingLabel="Loading employees"
          parseItem={(item) => ({
            value: item.id,
            label: `${item.firstName} ${item.lastName}`,
          })}
          // Bug 3 - Solved - Added a check for newValue.id
          onChange={async (newValue) => {
            if (newValue === null || newValue.id === "") {
              // Bug 7 - Restore the value of transactions from originalTransactions
              setFilteredTransactions(originalTransactions)
              return loadAllTransactions();
            }
            await loadTransactionsByEmployee(newValue.id);
          }}
        />
      

        <div className="RampBreak--l" />

        <div className="RampGrid">
          <Transactions transactions={transactions} />
          {/* Bug 6  - Fixed (Part 1 & 2) - Added a check for transactionsByEmployee to hide the "View More" button */}
          {/* Also, view more button is not visible when it reaches the end of "All Employees" */}
          {transactions !== null && transactionsByEmployee === null && paginatedTransactions?.nextPage !== null &&(
            <button
              className="RampButton"
              disabled={paginatedTransactionsUtils.loading}
              onClick={async () => {
                await loadAllTransactions()
              }}
            >
              View More
            </button>
          )}
        </div>
      </main>
    </Fragment>
  )
}
