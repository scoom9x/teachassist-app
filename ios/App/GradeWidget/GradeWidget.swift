import WidgetKit
import SwiftUI
import AppIntents

private let gradeStore = UserDefaults(suiteName: "group.ca.local.teachassist")!
struct BrowseAssessments: AppIntent {
    static var title: LocalizedStringResource = "Browse assessments"
    @Parameter(title: "Page") var page: Int
    init() { page = 0 }
    init(_ page: Int) { self.page = page }
    func perform() async throws -> some IntentResult {
        gradeStore.set(max(0, page), forKey: "assessmentPage")
        WidgetCenter.shared.reloadAllTimelines()
        return .result()
    }
}
struct GradeEntry: TimelineEntry {
    let date: Date
    let courses: [[String:Any]]
    let updated: String
    let hidden: Bool
    let page: Int
    var assessments: [[String: String]] {
        courses.flatMap { course in
            (course["assessments"] as? [[String:String]] ?? []).map { item in
                var item = item; item["course"] = course["code"] as? String ?? "Course"; return item
            }
        }.sorted { ($0["updated"] ?? "") > ($1["updated"] ?? "") }
    }
    var average: Double? {
        let marks = courses.compactMap { $0["final"] as? Double ?? $0["mark"] as? Double }
        return marks.isEmpty ? nil : marks.reduce(0,+) / Double(marks.count)
    }
}
struct GradeProvider: TimelineProvider {
    func placeholder(in context: Context) -> GradeEntry { GradeEntry(date:Date(),courses:[],updated:"",hidden:false,page:0) }
    func getSnapshot(in context: Context, completion: @escaping (GradeEntry)->Void) { completion(read()) }
    func getTimeline(in context: Context, completion: @escaping (Timeline<GradeEntry>)->Void) { completion(Timeline(entries:[read()],policy:.after(Date(timeIntervalSinceNow:1800)))) }
    func read()->GradeEntry {
        let courses=gradeStore.data(forKey:"courses").flatMap{try? JSONSerialization.jsonObject(with:$0)} as? [[String:Any]] ?? []
        return GradeEntry(date:Date(),courses:courses,updated:gradeStore.string(forKey:"updated") ?? "",hidden:gradeStore.bool(forKey:"hidden"),page:gradeStore.integer(forKey:"assessmentPage"))
    }
}
struct GradesView: View {
    let entry: GradeEntry
    @Environment(\.widgetFamily) var family
    var pageSize: Int { family == .systemLarge ? 4 : 1 }
    var page: Int { min(entry.page, max(0, (entry.assessments.count - 1) / pageSize)) }
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image("brand-logo").resizable().scaledToFit().frame(width: 22, height: 22).clipShape(RoundedRectangle(cornerRadius: 5))
                Text("TEACH ASSIST").font(.system(size: 10, weight: .black)).tracking(1).foregroundStyle(.blue)
                Spacer()

            }
            HStack(alignment: .firstTextBaseline) {
                Text(entry.hidden ? "•••" : entry.average.map { String(format: "%.1f%%", $0) } ?? "—")
                    .font(.system(size: family == .systemSmall ? 28 : 34, weight: .bold, design: .rounded)).minimumScaleFactor(0.7)
                if family != .systemSmall { Text("ALL COURSES\nUnweighted average").font(.system(size: 10)).foregroundStyle(.secondary) }
            }
            if family == .systemSmall { Text("All-course average").font(.caption2).foregroundStyle(.secondary) }
            if entry.courses.isEmpty { Text("Sign in to load your grades.").font(.caption) }
            else if family != .systemSmall {
                Divider()
                HStack {
                    Text("LATEST ASSESSMENTS").font(.system(size: 9, weight: .bold)).foregroundStyle(.secondary)
                    Spacer()
                    if entry.assessments.count > pageSize {
                        Button(intent: BrowseAssessments(page - 1)) { Image(systemName: "chevron.left") }.disabled(page == 0).accessibilityLabel("Previous assessments")
                        Text("\(page + 1)/\(max(1, (entry.assessments.count + pageSize - 1) / pageSize))").font(.system(size: 9))
                        Button(intent: BrowseAssessments(page + 1)) { Image(systemName: "chevron.right") }.disabled((page + 1) * pageSize >= entry.assessments.count).accessibilityLabel("Next assessments")
                    }
                }.buttonStyle(.plain)
                ForEach(Array(entry.assessments.dropFirst(page * pageSize).prefix(pageSize).enumerated()), id: \.offset) { _, assessment in
                    VStack(alignment: .leading, spacing: 3) {
                        Text(assessment["name"] ?? "Assessment").font(.caption.bold()).lineLimit(1)
                        Text("\(assessment["course"] ?? "") · \(entry.hidden ? "•••" : assessment["score"] ?? "Not graded")").font(.system(size: 10)).foregroundStyle(.secondary).lineLimit(1)
                    }
                }
                if entry.assessments.isEmpty { Text("Refresh grades in the app to load assessments.").font(.caption2).foregroundStyle(.secondary) }
            }
            if family == .systemSmall, let assessment = entry.assessments.first {
                Text(assessment["name"] ?? "Latest assessment").font(.system(size: 10, weight: .semibold)).lineLimit(1)
                Text(entry.hidden ? "•••" : assessment["score"] ?? "Not graded").font(.system(size: 9)).foregroundStyle(.secondary).lineLimit(1)
            }
            Spacer(minLength: 0)
            if let date = ISO8601DateFormatter().date(from: entry.updated) ?? ISO8601DateFormatter.fractional.date(from: entry.updated) {
                Text("Updated \(date.formatted(date: .abbreviated, time: .shortened))").font(.system(size: 9)).foregroundStyle(.secondary).lineLimit(1)
            }
        }.containerBackground(Color.blue.opacity(0.06), for: .widget)
    }
}
extension ISO8601DateFormatter { static var fractional:ISO8601DateFormatter { let f=ISO8601DateFormatter(); f.formatOptions=[.withInternetDateTime,.withFractionalSeconds]; return f } }
@main struct GradeWidget: Widget {
    let kind="TeachAssistGrades"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind:kind,provider:GradeProvider()) { entry in GradesView(entry:entry) }
            .configurationDisplayName("Grades & assessments")
            .description("Your all-course average and latest assessments. Browse assessments with the arrow buttons.")
            .supportedFamilies([.systemSmall,.systemMedium,.systemLarge])
    }
}
