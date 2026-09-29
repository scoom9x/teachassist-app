package ca.local.teachassist;
import org.junit.Test;
import static org.junit.Assert.*;
public class GradeStoreTest {
 @Test public void integerAndDecimalMarksAreTheSame(){assertTrue(GradeStore.sameMark(85,85.0));}
 @Test public void actualNumericalChangesAreDetected(){assertFalse(GradeStore.sameMark(85.0,85.1));}
 @Test public void unchangedUnavailableMarksDoNotNotify(){assertTrue(GradeStore.sameMark(null,null));}
 @Test public void publishingAZeroIsAChange(){assertFalse(GradeStore.sameMark(null,0));}
}
