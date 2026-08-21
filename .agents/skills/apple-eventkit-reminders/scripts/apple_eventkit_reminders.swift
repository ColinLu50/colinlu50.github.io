import EventKit
import Foundation

enum CLIError: Error, CustomStringConvertible {
    case usage(String)
    case invalidDate(String)
    case invalidDay(String)
    case permissionDenied
    case missingDefaultList
    case listNotFound(String)
    case invalidRange

    var description: String {
        switch self {
        case .usage(let message): return message
        case .invalidDate(let value): return "Invalid date/time: \(value). Expected yyyy-MM-dd HH:mm."
        case .invalidDay(let value): return "Invalid date: \(value). Expected yyyy-MM-dd."
        case .permissionDenied: return "Reminders access was not granted."
        case .missingDefaultList: return "No default Reminders list is available."
        case .listNotFound(let name): return "Reminders list not found: \(name)"
        case .invalidRange: return "The due time must be later than the start time."
        }
    }
}

enum Schedule {
    case allDay(Date)
    case timed(start: Date, due: Date)
}

struct Arguments {
    let title: String
    let schedule: Schedule
    let listName: String?
}

let dateFormatter: DateFormatter = {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.calendar = Calendar(identifier: .gregorian)
    formatter.timeZone = .current
    formatter.dateFormat = "yyyy-MM-dd HH:mm"
    formatter.isLenient = false
    return formatter
}()

let dayFormatter: DateFormatter = {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.calendar = Calendar(identifier: .gregorian)
    formatter.timeZone = .current
    formatter.dateFormat = "yyyy-MM-dd"
    formatter.isLenient = false
    return formatter
}()

func parseArguments(_ raw: [String]) throws -> Arguments {
    guard raw.first == "add" else {
        throw CLIError.usage("Usage: add --title TITLE (--date yyyy-MM-dd | --start 'yyyy-MM-dd HH:mm' --due 'yyyy-MM-dd HH:mm') [--list NAME]")
    }

    var values: [String: String] = [:]
    var index = 1
    while index < raw.count {
        let key = raw[index]
        guard key.hasPrefix("--"), index + 1 < raw.count else {
            throw CLIError.usage("Missing value for argument: \(key)")
        }
        values[key] = raw[index + 1]
        index += 2
    }

    guard let title = values["--title"], !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
        throw CLIError.usage("--title is required")
    }

    let schedule: Schedule
    if let dayText = values["--date"] {
        guard values["--start"] == nil, values["--due"] == nil else {
            throw CLIError.usage("--date cannot be combined with --start or --due")
        }
        guard let day = dayFormatter.date(from: dayText) else {
            throw CLIError.invalidDay(dayText)
        }
        schedule = .allDay(day)
    } else {
        guard let startText = values["--start"], let start = dateFormatter.date(from: startText) else {
            throw CLIError.invalidDate(values["--start"] ?? "<missing>")
        }
        guard let dueText = values["--due"], let due = dateFormatter.date(from: dueText) else {
            throw CLIError.invalidDate(values["--due"] ?? "<missing>")
        }
        guard due > start else { throw CLIError.invalidRange }
        schedule = .timed(start: start, due: due)
    }

    return Arguments(title: title, schedule: schedule, listName: values["--list"])
}

func requestReminderAccess(_ store: EKEventStore) async throws -> Bool {
    try await store.requestFullAccessToReminders()
}

func components(for date: Date) -> DateComponents {
    Calendar.current.dateComponents(
        [.calendar, .timeZone, .year, .month, .day, .hour, .minute],
        from: date
    )
}

func reminderList(in store: EKEventStore, named name: String?) throws -> EKCalendar {
    if let name {
        guard let match = store.calendars(for: .reminder).first(where: { $0.title == name }) else {
            throw CLIError.listNotFound(name)
        }
        return match
    }

    guard let defaultList = store.defaultCalendarForNewReminders() else {
        throw CLIError.missingDefaultList
    }
    return defaultList
}

func writeJSON(_ value: [String: Any], to handle: FileHandle) {
    let data = try! JSONSerialization.data(withJSONObject: value, options: [.prettyPrinted, .sortedKeys])
    handle.write(data)
    handle.write(Data("\n".utf8))
}

@main
struct AppleEventKitReminders {
    static func main() async {
        do {
            let arguments = try parseArguments(Array(CommandLine.arguments.dropFirst()))
            let store = EKEventStore()
            guard try await requestReminderAccess(store) else {
                throw CLIError.permissionDenied
            }

            let reminder = EKReminder(eventStore: store)
            reminder.title = arguments.title
            reminder.calendar = try reminderList(in: store, named: arguments.listName)

            var scheduleJSON: [String: Any]
            switch arguments.schedule {
            case .allDay(let day):
                let dayComponents = Calendar.current.dateComponents(
                    [.calendar, .timeZone, .year, .month, .day],
                    from: day
                )
                reminder.startDateComponents = dayComponents
                reminder.dueDateComponents = dayComponents
                scheduleJSON = [
                    "all_day": true,
                    "date": dayFormatter.string(from: day)
                ]
            case .timed(let start, let due):
                reminder.startDateComponents = components(for: start)
                reminder.dueDateComponents = components(for: due)
                scheduleJSON = [
                    "all_day": false,
                    "start": dateFormatter.string(from: start),
                    "due": dateFormatter.string(from: due),
                    "time_zone": TimeZone.current.identifier
                ]
            }

            try store.save(reminder, commit: true)

            var output: [String: Any] = [
                "status": "created",
                "id": reminder.calendarItemIdentifier,
                "title": reminder.title ?? arguments.title,
                "list": reminder.calendar.title
            ]
            output.merge(scheduleJSON) { _, new in new }
            writeJSON(output, to: .standardOutput)
        } catch {
            writeJSON([
                "status": "error",
                "message": String(describing: error)
            ], to: .standardError)
            exit(1)
        }
    }
}
